package com.personalaiagent.device

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.ComponentName
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
import android.content.pm.ResolveInfo

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
        Log.i(TAG, "DeviceAgentAccessibilityService connected")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance === this) instance = null
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Screen actions are executed through executePlan().
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted")
    }

    data class StepResult(
        val success: Boolean,
        val message: String
    )

    fun executePlan(
        steps: List<PlanStep>,
        onResult: (Boolean, String) -> Unit,
        onStepCompleted: ((PlanStep, StepResult) -> Unit)? = null
    ) {
        Thread {
            var lastMessage = "No steps to run."
            var success = false

            for (step in steps) {
                val result = runStep(step)

                lastMessage = result.message
                success = result.success

                Log.i(
                    TAG,
                    "Step ${step.type}: success=$success message=$lastMessage"
                )

                if (success) {
                    onStepCompleted?.invoke(step, result)
                }

                if (!success) break
            }

            mainHandler.post {
                onResult(success, lastMessage)
            }
        }.start()
    }

    private fun runStep(step: PlanStep): StepResult {
        return when (step.type) {

            "launch_app" -> launchApp(
                step.packageName
                    ?: return StepResult(false, "Missing package name")
            )

            "launch_app_or_url" -> launchAppOrUrl(
                step.packageName,
                step.text
                    ?: return StepResult(false, "Missing fallback URL")
            )

            "launch_app_by_label" -> launchAppByLabel(
                step.text
                    ?: return StepResult(false, "Missing app name")
            )

            "wait_for_element" -> waitForElement(
                step.text
                    ?: return StepResult(false, "Missing element text"),
                step.timeoutMs
            )

            "tap_element" -> tapElement(
                step.text
                    ?: return StepResult(false, "Missing tap text")
            )

            "wait_for_search_input" ->
                waitForSearchInput(step.timeoutMs)

            "focus_search_input" ->
                focusSearchInput()

            "type_text" -> typeIntoFocused(
                step.text
                    ?: return StepResult(false, "Missing text to type")
            )

            "submit" -> submitImeAction()

            "verify_contains" -> verifyContains(
                step.text
                    ?: return StepResult(false, "Missing verification text"),
                step.timeoutMs
            )

            "press_back" -> {
                val result = performGlobalAction(GLOBAL_ACTION_BACK)
                StepResult(
                    result,
                    if (result) "Pressed back" else "Back action failed"
                )
            }

            else -> StepResult(
                false,
                "Unknown step type: ${step.type}"
            )
        }
    }

    // --------------------------------------------------
    // App launching
    // --------------------------------------------------

    private fun launchApp(packageName: String): StepResult {
        return try {
            val intent =
                packageManager.getLaunchIntentForPackage(packageName)
                    ?: return StepResult(
                        false,
                        "$packageName is not installed or cannot be launched"
                    )

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
            Thread.sleep(1200)

            StepResult(true, "Launched $packageName")

        } catch (e: Exception) {
            StepResult(
                false,
                "Couldn't launch $packageName: ${e.message}"
            )
        }
    }

    private fun launchAppOrUrl(
        packageName: String?,
        fallbackUrl: String
    ): StepResult {

        if (!packageName.isNullOrBlank()) {
            val launchIntent =
                packageManager.getLaunchIntentForPackage(packageName)

            if (launchIntent != null) {
                try {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(launchIntent)
                    Thread.sleep(1200)

                    return StepResult(true, "Opened app: $packageName")

                } catch (e: Exception) {
                    Log.w(TAG, "App launch failed; trying browser fallback", e)
                }
            }
        }

        return openFallbackUrl(fallbackUrl)
    }

    // --------------------------------------------------
    // Dynamic installed-app lookup
    // --------------------------------------------------

    private fun normalizeAppName(value: String): String {
        return value.lowercase()
            .replace(Regex("[^a-z0-9]"), "")
    }

    private fun launchAppByLabel(appName: String): StepResult {
        return try {

            val launcherIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            val apps: List<ResolveInfo> =
                packageManager.queryIntentActivities(
                    launcherIntent,
                    android.content.pm.PackageManager.MATCH_DEFAULT_ONLY
                )

            if (apps.isEmpty()) {
                return StepResult(
                    false,
                    "No installed launcher apps were found"
                )
            }

            val wanted = normalizeAppName(appName)

            if (wanted.isBlank()) {
                return StepResult(false, "App name is empty")
            }

            fun labelOf(app: ResolveInfo): String {
                return app.loadLabel(packageManager).toString()
            }

            // First priority: exact app-name match.
            val exactMatches = apps.filter {
                normalizeAppName(labelOf(it)) == wanted
            }

            // Second priority: partial app-name match.
            val partialMatches = apps.filter {
                val label = normalizeAppName(labelOf(it))

                label.isNotBlank() &&
                    (label.contains(wanted) || wanted.contains(label))
            }

            val matches = (
                if (exactMatches.isNotEmpty()) exactMatches
                else partialMatches
            ).distinctBy {
                it.activityInfo.packageName
            }

            if (matches.isEmpty()) {
                return StepResult(
                    false,
                    "No installed app matched '$appName'. " +
                        "Found ${apps.size} launcher apps."
                )
            }

            if (matches.size > 1) {
                val names = matches.take(5).joinToString {
                    labelOf(it)
                }

                return StepResult(
                    false,
                    "More than one app matched '$appName': $names"
                )
            }

            val selected = matches.first()
            val info = selected.activityInfo
            val label = labelOf(selected)

            val launchIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)

                component = ComponentName(
                    info.packageName,
                    info.name
                )

                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            startActivity(launchIntent)
            Thread.sleep(1200)

            StepResult(
                true,
                "Opened $label"
            )

        } catch (e: Exception) {
            Log.e(TAG, "Dynamic app launch failed", e)

            StepResult(
                false,
                "Couldn't find or open '$appName': ${e.message}"
            )
        }
    }

    // --------------------------------------------------
    // Browser fallback
    // --------------------------------------------------

    private fun openFallbackUrl(url: String): StepResult {

        if (!url.startsWith("https://", ignoreCase = true)) {
            return StepResult(
                false,
                "Only HTTPS fallback URLs are allowed"
            )
        }

        return try {

            val chromeIntent = Intent(
                Intent.ACTION_VIEW,
                android.net.Uri.parse(url)
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                setPackage("com.android.chrome")
            }

            try {
                startActivity(chromeIntent)

            } catch (e: android.content.ActivityNotFoundException) {

                val browserIntent = Intent(
                    Intent.ACTION_VIEW,
                    android.net.Uri.parse(url)
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                startActivity(browserIntent)
            }

            Thread.sleep(1000)

            StepResult(
                true,
                "Opened fallback website in browser"
            )

        } catch (e: Exception) {
            StepResult(
                false,
                "Couldn't open app or website: ${e.message}"
            )
        }
    }

    // --------------------------------------------------
    // Search input detection
    // --------------------------------------------------

    private fun collectEditableNodes(
        node: AccessibilityNodeInfo,
        out: MutableList<AccessibilityNodeInfo>
    ) {
        if (node.isEditable) out.add(node)

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            collectEditableNodes(child, out)
        }
    }

    private fun findSearchInputNode(): AccessibilityNodeInfo? {

        val root = rootInActiveWindow ?: return null
        val candidates = mutableListOf<AccessibilityNodeInfo>()

        collectEditableNodes(root, candidates)

        val visible = candidates.filter {
            it.isVisibleToUser
        }

        if (visible.isEmpty()) return null
        if (visible.size == 1) return visible.first()

        fun signal(node: AccessibilityNodeInfo): String {
            val desc =
                node.contentDescription?.toString()?.lowercase() ?: ""

            val text =
                node.text?.toString()?.lowercase() ?: ""

            val resId =
                node.viewIdResourceName?.lowercase() ?: ""

            return "$desc $text $resId"
        }

        fun isMicLike(value: String): Boolean {
            return value.contains("voice") ||
                value.contains("microphone") ||
                value.contains(" mic")
        }

        fun looksLikeSearch(value: String): Boolean {
            return value.contains("search") ||
                value.contains("url") ||
                value.contains("omnibox")
        }

        val nonMic = visible.filterNot {
            isMicLike(signal(it))
        }

        return nonMic.firstOrNull {
            looksLikeSearch(signal(it))
        } ?: nonMic.firstOrNull() ?: visible.first()
    }

    private fun waitForSearchInput(timeoutMs: Long): StepResult {

        val deadline = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < deadline) {

            if (findSearchInputNode() != null) {
                return StepResult(true, "Search input appeared")
            }

            Thread.sleep(300)
        }

        return StepResult(
            false,
            "Timed out waiting for an editable search field"
        )
    }

    private fun focusSearchInput(): StepResult {

        val node = findSearchInputNode()
            ?: return StepResult(
                false,
                "Couldn't find an editable search field"
            )

        node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)

        var target: AccessibilityNodeInfo? = node

        while (target != null && !target.isClickable) {
            target = target.parent
        }

        (target ?: node).performAction(
            AccessibilityNodeInfo.ACTION_CLICK
        )

        Thread.sleep(400)

        val nowFocused =
            rootInActiveWindow?.findFocus(
                AccessibilityNodeInfo.FOCUS_INPUT
            )

        if (nowFocused != null) {
            return StepResult(true, "Focused the search field")
        }

        return tapByCoordinates(node)
    }

    // --------------------------------------------------
    // Generic screen actions
    // --------------------------------------------------

    private fun findByText(text: String): AccessibilityNodeInfo? {

        val root = rootInActiveWindow ?: return null
        val nodes = root.findAccessibilityNodeInfosByText(text.trim())

        return nodes.firstOrNull()
    }

    private fun waitForElement(
        text: String,
        timeoutMs: Long
    ): StepResult {

        val deadline = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < deadline) {

            if (findByText(text) != null) {
                return StepResult(
                    true,
                    "Found \"$text\" on screen"
                )
            }

            Thread.sleep(300)
        }

        return StepResult(
            false,
            "Timed out waiting for \"$text\" to appear"
        )
    }

    private fun tapElement(text: String): StepResult {

        val node = findByText(text)
            ?: return StepResult(
                false,
                "Couldn't find \"$text\" to tap"
            )

        var target: AccessibilityNodeInfo? = node

        while (target != null && !target.isClickable) {
            target = target.parent
        }

        val clickTarget = target ?: node

        val clicked = clickTarget.performAction(
            AccessibilityNodeInfo.ACTION_CLICK
        )

        if (clicked) {
            return StepResult(true, "Tapped \"$text\"")
        }

        return tapByCoordinates(node)
    }

    private fun tapByCoordinates(
        node: AccessibilityNodeInfo
    ): StepResult {

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        if (bounds.isEmpty) {
            return StepResult(
                false,
                "Element has no visible bounds"
            )
        }

        val path = Path()

        path.moveTo(
            bounds.centerX().toFloat(),
            bounds.centerY().toFloat()
        )

        val gesture = GestureDescription.Builder()
            .addStroke(
                GestureDescription.StrokeDescription(path, 0, 100)
            )
            .build()

        val dispatched = dispatchGesture(gesture, null, null)

        return if (dispatched) {
            StepResult(true, "Tapped via coordinates")
        } else {
            StepResult(false, "Failed to dispatch tap gesture")
        }
    }

    private fun typeIntoFocused(text: String): StepResult {

        val root = rootInActiveWindow
            ?: return StepResult(
                false,
                "No active window to type into"
            )

        val focused = root.findFocus(
            AccessibilityNodeInfo.FOCUS_INPUT
        ) ?: return StepResult(
            false,
            "No focused text field — tap the field first"
        )

        val arguments = Bundle()

        arguments.putCharSequence(
            AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
            text
        )

        val ok = focused.performAction(
            AccessibilityNodeInfo.ACTION_SET_TEXT,
            arguments
        )

        return if (ok) {
            StepResult(true, "Typed text")
        } else {
            StepResult(
                false,
                "Couldn't set text on the focused field"
            )
        }
    }

    private fun submitImeAction(): StepResult {

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return StepResult(
                false,
                "IME submit requires Android 11 or newer"
            )
        }

        val root = rootInActiveWindow
            ?: return StepResult(
                false,
                "No active window to submit from"
            )

        val focused = root.findFocus(
            AccessibilityNodeInfo.FOCUS_INPUT
        ) ?: return StepResult(
            false,
            "No focused field to submit"
        )

        val submitted = focused.performAction(
            AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id
        )

        return if (submitted) {
            StepResult(true, "Submitted")
        } else {
            StepResult(
                false,
                "The focused field didn't accept a submit action"
            )
        }
    }

    private fun verifyContains(
        text: String,
        timeoutMs: Long
    ): StepResult {

        val deadline = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < deadline) {

            if (findByText(text) != null) {
                return StepResult(
                    true,
                    "Verified: \"$text\" is on screen"
                )
            }

            Thread.sleep(400)
        }

        return StepResult(
            false,
            "Could not verify \"$text\" appeared on screen"
        )
    }

    // --------------------------------------------------
    // Screen observation
    // --------------------------------------------------

    fun observeScreen(): ScreenObservation {

        val root = rootInActiveWindow
            ?: return ScreenObservation(
                packageName = null,
                elements = emptyList()
            )

        val elements = mutableListOf<ScreenElement>()

        fun collect(node: AccessibilityNodeInfo) {

            if (node.isVisibleToUser) {

                elements.add(
                    ScreenElement(
                        text = node.text?.toString(),
                        contentDescription =
                            node.contentDescription?.toString(),
                        className = node.className?.toString(),
                        viewId = node.viewIdResourceName,
                        editable = node.isEditable,
                        clickable = node.isClickable,
                        visible = node.isVisibleToUser
                    )
                )
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i) ?: continue
                collect(child)
            }
        }

              collect(root)

      return ScreenObservation(
          packageName = root.packageName?.toString(),
          elements = elements
      )
  }
}
    
