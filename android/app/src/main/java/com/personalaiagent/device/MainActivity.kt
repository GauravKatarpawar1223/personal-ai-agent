package com.personalaiagent.device

import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: SharedPreferences
    private lateinit var loginGroup: LinearLayout
    private lateinit var agentGroup: LinearLayout
    private lateinit var statusText: TextView
    private var accessToken: String? = null

    private val micPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startListening() else setStatus("Microphone permission denied.")
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences("device_agent_v0", MODE_PRIVATE)
        loginGroup = findViewById(R.id.loginGroup)
        agentGroup = findViewById(R.id.agentGroup)
        statusText = findViewById(R.id.statusText)

        // V0 stores the token in plain SharedPreferences for simplicity.
        // Known limitation — see README "Known limitations": harden with
        // androidx.security EncryptedSharedPreferences before anything
        // beyond local experimentation.
        accessToken = prefs.getString("access_token", null)
        if (accessToken != null) showAgentUi()

        findViewById<Button>(R.id.loginButton).setOnClickListener { handleLogin() }
        findViewById<Button>(R.id.accessibilitySettingsButton).setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
        findViewById<Button>(R.id.micButton).setOnClickListener { onMicPressed() }
    }

    private fun handleLogin() {
        val email = findViewById<EditText>(R.id.emailInput).text.toString().trim()
        val password = findViewById<EditText>(R.id.passwordInput).text.toString()
        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Enter email and password", Toast.LENGTH_SHORT).show()
            return
        }
        setStatus("Signing in…")
        Thread {
            val result = BackendClient.signIn(email, password)
            runOnUiThread {
                if (result.statusCode in 200..299) {
                    val token = try {
                        JSONObject(result.body).optString("access_token").takeIf { it.isNotBlank() }
                    } catch (e: Exception) {
                        null
                    }
                    if (token != null) {
                        accessToken = token
                        prefs.edit().putString("access_token", token).apply()
                        showAgentUi()
                        setStatus("Signed in. Enable accessibility, then try a command.")
                    } else {
                        setStatus("Signed in, but no access token was returned.")
                    }
                } else {
                    val errorMsg = parseErrorResponse(result.body) ?: "Sign-in failed (${result.statusCode})."
                    setStatus(errorMsg)
                }
            }
        }.start()
    }

    private fun showAgentUi() {
        loginGroup.visibility = LinearLayout.GONE
        agentGroup.visibility = LinearLayout.VISIBLE
    }

    private fun onMicPressed() {
        if (!isAccessibilityServiceEnabled()) {
            setStatus("Enable the accessibility service first (step 1).")
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            setStatus("Speech recognition isn't available on this device.")
            return
        }
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            micPermissionLauncher.launch(android.Manifest.permission.RECORD_AUDIO)
            return
        }
        startListening()
    }

    private fun startListening() {
        val recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            // "en-IN" tends to transcribe romanized Hinglish more usably
            // than a pure Hindi model for V0's phrasing — see README
            // "Known limitations" for why this isn't a solved problem.
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN")
        }
        setStatus("Listening…")
        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val text = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                recognizer.destroy()
                if (text.isNullOrBlank()) {
                    setStatus("Didn't catch anything — try again.")
                } else {
                    setStatus("Heard: \"$text\"")
                    handleRecognizedText(text)
                }
            }

            override fun onError(error: Int) {
                recognizer.destroy()
                setStatus("Speech recognition error (code $error).")
            }

            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        recognizer.startListening(intent)
    }

    private fun handleRecognizedText(text: String) {
        val token = accessToken ?: return setStatus("Not signed in.")
        setStatus("Planning…")
        Thread {
            val planResult = BackendClient.requestPlan(token, text)
            if (planResult.statusCode !in 200..299) {
                val message = parseErrorResponse(planResult.body) ?: "Couldn't plan that command (${planResult.statusCode})."
                runOnUiThread { setStatus(message) }
                return@Thread
            }
            val plan = parsePlanResponse(planResult.body)
            if (plan == null) {
                runOnUiThread { setStatus("Got an unreadable plan from the server.") }
                return@Thread
            }

            runOnUiThread { setStatus("Executing: ${plan.summary}") }

            val service = DeviceAgentAccessibilityService.instance
            if (service == null) {
                runOnUiThread { setStatus("Accessibility service isn't running — enable it in Settings.") }
                reportOutcomeAsync(token, plan.intent, plan.summary, success = false, detail = "Accessibility service not running")
                return@Thread
            }

            service.executePlan(plan.steps) { success, message ->
                runOnUiThread { setStatus(if (success) "Done: $message" else "Failed: $message") }
                reportOutcomeAsync(token, plan.intent, plan.summary, success, message)
            }
        }.start()
    }

    private fun reportOutcomeAsync(token: String, intent: String, summary: String, success: Boolean, detail: String) {
        Thread { BackendClient.reportOutcome(token, intent, summary, success, detail) }.start()
    }

    /** Checks Settings.Secure directly rather than assuming — the user
     *  may have force-stopped the app or disabled the service since
     *  launch, and this app has no other way to know that changed. */
    private fun isAccessibilityServiceEnabled(): Boolean {
        val expectedId = "$packageName/${DeviceAgentAccessibilityService::class.java.name}"
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        return enabledServices.split(":").any { it.equals(expectedId, ignoreCase = true) }
    }

    private fun setStatus(message: String) {
        statusText.text = message
    }
}
