package com.personalaiagent.device

data class ScreenElement(
    val text: String?,
    val contentDescription: String?,
    val className: String?,
    val viewId: String?,
    val editable: Boolean,
    val clickable: Boolean,
    val visible: Boolean
)

data class ScreenObservation(
    val packageName: String?,
    val elements: List<ScreenElement>
)
