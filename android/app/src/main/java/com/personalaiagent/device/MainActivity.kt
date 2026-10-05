package com.personalaiagent.device

import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
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
    private var refreshToken: String? = null
private fun testScreenObservation() {
    val observation = DeviceAgentAccessibilityService.instance?.observeScreen()

    if (observation == null) {
        Log.w("DeviceAgent", "Screen observation unavailable")
        return
    }

    val token = accessToken
    if (token == null) {
        Log.w("DeviceAgent", "No access token available")
        return
    }

    Thread {
        val result = withTokenRefresh { currentToken ->
            BackendClient.sendScreenObservation(
                accessToken = currentToken,
                packageName = observation.packageName,
                elements = observation.elements
            )
        }

        Log.i(
            "DeviceAgent",
            "Screen observation sent: status=${result?.statusCode}, body=${result?.body}"
        )
    }.start()
}

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

        // V0 stores tokens in plain SharedPreferences for simplicity.
        // Known limitation — see README "Known limitations": harden with
        // androidx.security EncryptedSharedPreferences before anything
        // beyond local experimentation.
        accessToken = prefs.getString("access_token", null)
        refreshToken = prefs.getString("refresh_token", null)
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
                    val tokens = extractTokens(result.body)
                    if (tokens != null) {
                        saveTokens(tokens.first, tokens.second)
                        showAgentUi()
                        setStatus("Signed in. Enable accessibility, then try a command.")
                    } else {
                        setStatus("Signed in, but no access/refresh token was returned.")
                    }
                } else {
                    val errorMsg = parseErrorResponse(result.body) ?: "Sign-in failed (${result.statusCode})."
                    setStatus(errorMsg)
                }
            }
        }.start()
    }

    /** Pulls {access_token, refresh_token} out of a Supabase auth
     *  response. Never logs either value — only returns them in memory. */
    private fun extractTokens(json: String): Pair<String, String>? {
        return try {
            val obj = JSONObject(json)
            val access = obj.optString("access_token").takeIf { it.isNotBlank() }
            val refresh = obj.optString("refresh_token").takeIf { it.isNotBlank() }
            if (access != null && refresh != null) Pair(access, refresh) else null
        } catch (e: Exception) {
            null
        }
    }

    private fun saveTokens(access: String, refresh: String) {
        accessToken = access
        refreshToken = refresh
        prefs.edit().putString("access_token", access).putString("refresh_token", refresh).apply()
    }

    private fun clearTokens() {
        accessToken = null
        refreshToken = null
        prefs.edit().remove("access_token").remove("refresh_token").apply()
    }

    private fun showAgentUi() {
        loginGroup.visibility = LinearLayout.GONE
        agentGroup.visibility = LinearLayout.VISIBLE
    }

    private fun showLoginUi() {
        loginGroup.visibility = LinearLayout.VISIBLE
        agentGroup.visibility = LinearLayout.GONE
    }

    /**
     * Runs [call] with the current access token. If the backend returns
     * 401, tries exactly one token refresh and retries [call] once with
     * the new token — never loops, never retries more than once. If the
     * refresh itself fails, clears the saved session and switches the UI
     * back to login — the user is never asked to clear app data.
     * Must be called from a background thread (blocks on network I/O).
     */
    private fun withTokenRefresh(call: (token: String) -> HttpResult): HttpResult? {
        val token = accessToken ?: return null
        val first = call(token)
        if (first.statusCode != 401) return first

        val savedRefresh = refreshToken ?: return expireSession()
        val refreshResult = BackendClient.refreshToken(savedRefresh)
        if (refreshResult.statusCode !in 200..299) return expireSession()

        val newTokens = extractTokens(refreshResult.body) ?: return expireSession()
        saveTokens(newTokens.first, newTokens.second)
        return call(newTokens.first)
    }

    private fun expireSession(): HttpResult? {
        clearTokens()
        runOnUiThread {
            showLoginUi()
            setStatus("Session expired. Please sign in again.")
        }
        return null
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
        if (accessToken == null) return setStatus("Not signed in.")
        setStatus("Planning…")
        Thread {
            val planResult = withTokenRefresh { token -> BackendClient.requestPlan(token, text) }
                ?: return@Thread // session already expired and shown to the user

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
                reportOutcomeAsync(plan.intent, plan.summary, success = false, detail = "Accessibility service not running")
                return@Thread
            }

            service.executePlan(
    steps = plan.steps,
    onResult = { success, message ->
        runOnUiThread {
            setStatus(
                if (success) "Done: $message"
                else "Failed: $message"
            )
        }

        reportOutcomeAsync(
            plan.intent,
            plan.summary,
            success,
            message
        )
    },
    onStepCompleted = { _, _ ->
        testScreenObservation()
    }
)
    }

    private fun reportOutcomeAsync(intent: String, summary: String, success: Boolean, detail: String) {
        Thread {
            withTokenRefresh { token -> BackendClient.reportOutcome(token, intent, summary, success, detail) }
        }.start()
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
