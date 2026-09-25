package com.personalaiagent.device

import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/** Result of an HTTP call: raw body + status, so callers decide how to
 *  interpret failure — this file never swallows an error into a fake
 *  success. */
data class HttpResult(val statusCode: Int, val body: String)

object BackendClient {

    /**
     * Signs in with Supabase's password grant directly over REST — no
     * Supabase Kotlin SDK dependency for V0. Returns the access token on
     * success, or null (caller shows the real error text from the body).
     */
    fun signIn(email: String, password: String): HttpResult {
        val url = URL("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=password")
        val body = JSONObject().put("email", email).put("password", password).toString()
        return postJson(url, body, extraHeaders = mapOf("apikey" to BuildConfig.SUPABASE_PUBLISHABLE_KEY))
    }

    /** POST /api/agent/device/plan — the "brain" step. */
    fun requestPlan(accessToken: String, text: String): HttpResult {
        val url = URL("${BuildConfig.BACKEND_BASE_URL}/api/agent/device/plan")
        val body = JSONObject().put("text", text).toString()
        return postJson(url, body, extraHeaders = mapOf("Authorization" to "Bearer $accessToken"))
    }

    /** POST /api/agent/device/report — always sends the REAL outcome. */
    fun reportOutcome(accessToken: String, intent: String, summary: String, success: Boolean, detail: String): HttpResult {
        val url = URL("${BuildConfig.BACKEND_BASE_URL}/api/agent/device/report")
        val body = JSONObject()
            .put("intent", intent)
            .put("summary", summary)
            .put("status", if (success) "completed" else "failed")
            .put("detail", detail)
            .toString()
        return postJson(url, body, extraHeaders = mapOf("Authorization" to "Bearer $accessToken"))
    }

    private fun postJson(url: URL, jsonBody: String, extraHeaders: Map<String, String>): HttpResult {
        val connection = url.openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            for ((key, value) in extraHeaders) {
                connection.setRequestProperty(key, value)
            }
            connection.connectTimeout = 10_000
            connection.readTimeout = 15_000

            OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { it.write(jsonBody) }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val responseBody = stream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() } ?: ""
            HttpResult(status, responseBody)
        } catch (e: Exception) {
            HttpResult(-1, "Network error: ${e.message}")
        } finally {
            connection.disconnect()
        }
    }
}
