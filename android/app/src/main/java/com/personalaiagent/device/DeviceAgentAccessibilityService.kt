package com.personalaiagent.device

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Device execution layer for V0. Deliberately dumb: it has no concept of
 * "intent" or "planning" — it runs a list of [PlanStep]s it's handed
 * (from the server-planned response — see BackendClient.requestPlan)
 * using a small set of reusable primitives (findByText / tapElement /
 * typeIntoFocused / waitForElement / verifyContains / launchApp /
 * pressBack). The web backend remains the only place that decides
 * *what* to do; this class only knows *how* to do generic screen
 * actions, which is what keeps it reusable for whatever the backend
 * asks next, without hardcoding a single app-specific workflow here.
 *
 * android:packageNames="com.android.chrome" in
 * accessibility_service_config.xml means this service literally cannot
 * see or act on any other app's screen right now — enforced by the
 * platform, not just by convention in this code.
 */
class DeviceAgentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "DeviceAgent"

        @Volatile
        var instance: DeviceAgentAccessibilityService? = null
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "DeviceAgentAccessibilityService connected (Chrome-scoped)")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance === this) instance = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // V0 is purely step-driven (see executePlan) rather than
        // event-reactive — it doesn't need to do anything here yet.
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted by the system")
    }

    /**
     * Runs [steps] in order on a background thread (each may need to
     * poll for a UI change) and calls [onResult] on the main thread with
     * (success, lastMessage) once done. Stops at the FIRST failing step
     * — it never continues past a step it couldn't verify, and never
     * reports success unless the whole sequence actually completed.
     */
    fun executePlan(steps: List<PlanStep>, onResult: (Boolean, String) -> Unit) {
        Thread {
            var lastMessage = "No steps to run."
            var success = false
            for (step in steps) {
                val result = runStep(step)
                lastMessage = result.message
                success = result.success
                Log.i(TAG, "Step ${step.type}: success=$success message=$lastMessage")
                if (!success) break
            }
            mainHandler.post { onResult(success, lastMessage) }
        }.start()
    }

    private data class StepResult(val success: Boolean, val message: String)

    private fun runStep(step: PlanStep): StepResult {
        return when (step.type) {
            "launch_app" -> launchApp(step.packageName ?: return StepResult(false, "launch_app: missing packageName"))
            "wait_for_element" -> waitForElement(step.text ?: return StepResult(false, "wait_for_element: missing text"), step.timeoutMs)
            "tap_element" -> tapElement(step.text ?: return StepResult(false, "tap_element: missing text"))
            "type_text" -> typeIntoFocused(step.text ?: return StepResult(false, "type_text: missing text"))
            "submit" -> submitImeAction()
            "verify_contains" -> verifyContains(step.text ?: return StepResult(false, "verify_contains: missing text"), step.timeoutMs)
            "press_back" -> {
                performGlobalAction(GLOBAL_ACTION_BACK)
                StepResult(true, "Pressed back")
            }
            else -> StepResult(false, "Unknown step type: ${step.type}")
        }
    }

    // ---------------- Reusable primitives ----------------

    private fun launchApp(packageName: String): StepResult {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            ?: return StepResult(false, "$packageName is not installed")
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(launchIntent)
        Thread.sleep(1200) // give the app time to come to the foreground
        return StepResult(true, "Launched $packageName")
    }

    private fun findByText(text: String): AccessibilityNodeInfo? {
        val root = rootInActiveWindow ?: return null
        val matches = root.findAccessibilityNodeInfosByText(text) ?: return null
        return matches.firstOrNull { it.isVisibleToUser }
    }

    private fun waitForElement(text: String, timeoutMs: Long): StepResult {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (findByText(text) != null) return StepResult(true, "Found \"$text\" on screen")
            Thread.sleep(300)
        }
        return StepResult(false, "Timed out waiting for \"$text\" to appear")
    }

    private fun tapElement(text: String): StepResult {
        val node = findByText(text) ?: return StepResult(false, "Couldn't find \"$text\" to tap")
        // The matched node (e.g. a text label) often isn't itself
        // clickable — walk up to the nearest ancestor that is.
        var target: AccessibilityNodeInfo? = node
        while (target != null && !target.isClickable) {
            target = target.parent
        }
        val clickTarget = target ?: node
        val clicked = clickTarget.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        if (clicked) return StepResult(true, "Tapped \"$text\"")
        return tapByCoordinates(node)
    }

    /** Fallback when no ancestor exposes ACTION_CLICK — dispatches a real
     *  tap gesture at the node's actual on-screen position instead. */
    private fun tapByCoordinates(node: AccessibilityNodeInfo): StepResult {
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        if (bounds.isEmpty) return StepResult(false, "Element has no visible bounds to tap")

        val path = Path()
        path.moveTo(bounds.centerX().toFloat(), bounds.centerY().toFloat())
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
            .build()
        val dispatched = dispatchGesture(gesture, null, null)
        return if (dispatched) StepResult(true, "Tapped via coordinates")
        else StepResult(false, "Failed to dispatch tap gesture")
    }

    private fun typeIntoFocused(text: String): StepResult {
        val root = rootInActiveWindow ?: return StepResult(false, "No active window to type into")
        val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: return StepResult(false, "No focused text field — tap the field first")
        val arguments = Bundle()
        arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        val ok = focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
        return if (ok) StepResult(true, "Typed \"$text\"") else StepResult(false, "Couldn't set text on the focused field")
    }

    /** Requires Android 11+ (API 30) for ACTION_IME_ENTER — the only
     *  reliable, generic (non-coordinate-guessing) way to submit a
     *  search field via accessibility. Fails honestly below API 30
     *  rather than guessing a tap location. */
    private fun submitImeAction(): StepResult {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return StepResult(false, "Submitting via IME action needs Android 11+ (this device is older)")
        }
        val root = rootInActiveWindow ?: return StepResult(false, "No active window to submit from")
        val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: return StepResult(false, "No focused field to submit")
        val submitted = focused.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id)
        return if (submitted) StepResult(true, "Submitted")
        else StepResult(false, "The focused field didn't accept a submit action")
    }

    private fun verifyContains(text: String, timeoutMs: Long): StepResult {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (findByText(text) != null) return StepResult(true, "Verified: \"$text\" is on screen")
            Thread.sleep(400)
        }
        return StepResult(false, "Could not verify \"$text\" appeared on screen")
    }
}
