package com.personalaiagent.device

import org.json.JSONArray
import org.json.JSONObject

/** Mirrors lib/agent/device-planner.ts's DeviceStep on the web backend —
 *  keep these two in sync by hand; V0 has no shared schema codegen. */
data class PlanStep(
    val type: String,
    val text: String? = null,
    val packageName: String? = null,
    val timeoutMs: Long = 5000L
)

data class DevicePlan(
    val intent: String,
    val targetPackage: String,
    val steps: List<PlanStep>,
    val summary: String
)

/** Parses the {"plan": {...}} body returned by POST /api/agent/device/plan.
 *  Returns null on any malformed/unexpected shape — never guesses a plan
 *  from a partial response. */
fun parsePlanResponse(json: String): DevicePlan? {
    return try {
        val root = JSONObject(json)
        val planObj = root.getJSONObject("plan")
        val stepsArray: JSONArray = planObj.getJSONArray("steps")
        val steps = mutableListOf<PlanStep>()
        for (i in 0 until stepsArray.length()) {
            val stepObj = stepsArray.getJSONObject(i)
            steps.add(
                PlanStep(
                    type = stepObj.getString("type"),
                    text = if (stepObj.has("text")) stepObj.optString("text") else null,
                    packageName = if (stepObj.has("packageName")) stepObj.optString("packageName") else null,
                    timeoutMs = if (stepObj.has("timeoutMs")) stepObj.optLong("timeoutMs") else 5000L
                )
            )
        }
        DevicePlan(
            intent = planObj.getString("intent"),
            targetPackage = planObj.getString("targetPackage"),
            steps = steps,
            summary = planObj.getString("summary")
        )
    } catch (e: Exception) {
        null
    }
}

/** Extracts a single-line error message from a {"error": "..."} response,
 *  or null if the body isn't shaped that way. */
fun parseErrorResponse(json: String): String? {
    return try {
        JSONObject(json).optString("error").takeIf { it.isNotBlank() }
    } catch (e: Exception) {
        null
    }
}
