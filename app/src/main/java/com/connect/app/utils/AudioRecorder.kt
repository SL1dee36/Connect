package com.connect.app.utils

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import java.io.File

class AudioRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var isRecording = false

    fun start(): Boolean {
        try {
            val dir = File(context.cacheDir, "audio_records").apply { mkdirs() }
            outputFile = File(dir, "voice_${System.currentTimeMillis()}.m4a")

            recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(128000)
                setAudioSamplingRate(44100)
                setOutputFile(outputFile!!.absolutePath)
                prepare()
                start()
            }
            isRecording = true
            return true
        } catch (e: Exception) {
            Log.e("AudioRecorder", "Failed to start recording", e)
            cancel()
            return false
        }
    }

    fun stop(): File? {
        if (!isRecording) return null
        return try {
            recorder?.apply {
                stop()
                reset()
                release()
            }
            recorder = null
            isRecording = false
            outputFile?.takeIf { it.exists() && it.length() > 0 }
        } catch (e: Exception) {
            Log.e("AudioRecorder", "Failed to stop recording", e)
            cancel()
            null
        }
    }

    fun cancel() {
        try {
            recorder?.apply {
                stop()
                reset()
                release()
            }
        } catch (_: Exception) {}
        recorder = null
        isRecording = false
        outputFile?.delete()
        outputFile = null
    }

    fun isCurrentlyRecording(): Boolean = isRecording
}
