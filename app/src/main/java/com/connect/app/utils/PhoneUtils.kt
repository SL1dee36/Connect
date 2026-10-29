package com.connect.app.utils

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation

object PhoneUtils {

    /**
     * Форматирует строку телефона для отображения в интерфейсе (+7 (XXX) XXX-XX-XX).
     */
    fun formatPhoneNumber(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        val trimmed = raw.trim()
        val digits = trimmed.filter { it.isDigit() }
        if (digits.isEmpty()) return trimmed

        // Если это российский номер (11 цифр, начинающийся с 7 или 8)
        if (digits.length == 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
            val part1 = digits.substring(1, 4)
            val part2 = digits.substring(4, 7)
            val part3 = digits.substring(7, 9)
            val part4 = digits.substring(9, 11)
            return "+7 ($part1) $part2-$part3-$part4"
        } else if (digits.length == 10) {
            val part1 = digits.substring(0, 3)
            val part2 = digits.substring(3, 6)
            val part3 = digits.substring(6, 8)
            val part4 = digits.substring(8, 10)
            return "+7 ($part1) $part2-$part3-$part4"
        }

        // Если это произвольный номер с префиксом +
        return if (trimmed.startsWith("+")) trimmed else "+$trimmed"
    }

    /**
     * VisualTransformation для динамического форматирования ввода номера телефона:
     * Пользователь вводит только цифры или +7..., а видит +7 (XXX) XXX-XX-XX
     */
    class RuPhoneVisualTransformation : VisualTransformation {
        override fun filter(text: AnnotatedString): TransformedText {
            val raw = text.text
            val digits = raw.filter { it.isDigit() }
            
            // Если пусто, ничего не форматируем
            if (digits.isEmpty()) {
                return TransformedText(text, OffsetMapping.Identity)
            }

            val effectiveDigits = if (digits.startsWith("8") || digits.startsWith("7")) {
                digits.drop(1)
            } else {
                digits
            }.take(10)

            val out = StringBuilder("+7 ")
            if (effectiveDigits.isNotEmpty()) {
                out.append("(")
                val code = effectiveDigits.take(3)
                out.append(code)
                if (effectiveDigits.length >= 3) {
                    out.append(") ")
                }
            }
            if (effectiveDigits.length > 3) {
                val p1 = effectiveDigits.substring(3, minOf(6, effectiveDigits.length))
                out.append(p1)
                if (effectiveDigits.length >= 6) {
                    out.append("-")
                }
            }
            if (effectiveDigits.length > 6) {
                val p2 = effectiveDigits.substring(6, minOf(8, effectiveDigits.length))
                out.append(p2)
                if (effectiveDigits.length >= 8) {
                    out.append("-")
                }
            }
            if (effectiveDigits.length > 8) {
                val p3 = effectiveDigits.substring(8, minOf(10, effectiveDigits.length))
                out.append(p3)
            }

            val transformedString = out.toString()

            val offsetMapping = object : OffsetMapping {
                override fun originalToTransformed(offset: Int): Int {
                    val clamped = offset.coerceIn(0, raw.length)
                    val rawDigitsBefore = raw.take(clamped).count { it.isDigit() }
                    val effBefore = if (digits.startsWith("8") || digits.startsWith("7")) {
                        (rawDigitsBefore - 1).coerceAtLeast(0)
                    } else {
                        rawDigitsBefore
                    }

                    var count = 0
                    var trIdx = 0
                    while (trIdx < transformedString.length && count < effBefore) {
                        if (trIdx >= 3 && transformedString[trIdx].isDigit()) {
                            count++
                        }
                        trIdx++
                    }
                    return trIdx.coerceAtMost(transformedString.length)
                }

                override fun transformedToOriginal(offset: Int): Int {
                    val clamped = offset.coerceIn(0, transformedString.length)
                    var digitCountInTr = 0
                    for (i in 0 until clamped) {
                        if (i >= 3 && transformedString[i].isDigit()) {
                            digitCountInTr++
                        }
                    }
                    val targetDigits = if (digits.startsWith("8") || digits.startsWith("7")) {
                        digitCountInTr + 1
                    } else {
                        digitCountInTr
                    }
                    var curDigits = 0
                    var origIdx = 0
                    while (origIdx < raw.length && curDigits < targetDigits) {
                        if (raw[origIdx].isDigit()) curDigits++
                        origIdx++
                    }
                    return origIdx.coerceAtMost(raw.length)
                }
            }

            return TransformedText(AnnotatedString(transformedString), offsetMapping)
        }
    }
}
