package com.connect.app.ui.components

import android.graphics.Outline
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import androidx.camera.core.Camera
import androidx.camera.core.CameraControl
import androidx.camera.core.CameraInfo
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.FlipCameraAndroid
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material.icons.rounded.ZoomIn
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.delay
import java.io.File

@Composable
fun RoundCameraRecordOverlay(
    isInitiallyLocked: Boolean = false,
    onDismiss: () -> Unit,
    onVideoRecorded: (File) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var recording by remember { mutableStateOf<Recording?>(null) }
    var currentOutputFile by remember { mutableStateOf<File?>(null) }
    var recordingDuration by remember { mutableIntStateOf(0) }
    var isRecordingActive by remember { mutableStateOf(false) }
    var isFinalizing by remember { mutableStateOf(false) }

    var isFrontCamera by remember { mutableStateOf(true) }
    var cameraControl by remember { mutableStateOf<CameraControl?>(null) }
    var cameraInfo by remember { mutableStateOf<CameraInfo?>(null) }
    var currentZoomRatio by remember { mutableFloatStateOf(1f) }
    var minZoomRatio by remember { mutableFloatStateOf(1f) }
    var maxZoomRatio by remember { mutableFloatStateOf(5f) }

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(700),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    fun stopAndFinish(sendVideo: Boolean) {
        if (isFinalizing) return
        isRecordingActive = false
        if (sendVideo) {
            isFinalizing = true
            try {
                recording?.stop()
            } catch (e: Exception) {
                Log.e("Camera", "Error stopping recording", e)
            }
        } else {
            try {
                recording?.stop()
            } catch (_: Exception) {}
            currentOutputFile?.delete()
            onDismiss()
        }
    }

    LaunchedEffect(isRecordingActive) {
        while (isRecordingActive) {
            delay(1000)
            recordingDuration++
            if (recordingDuration >= 60) {
                stopAndFinish(sendVideo = true)
                break
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            try {
                recording?.stop()
            } catch (_: Exception) {}
        }
    }

    Dialog(
        onDismissRequest = {
            stopAndFinish(sendVideo = false)
        },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.88f)),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Recording time badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Red.copy(alpha = pulseAlpha))
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "0:%02d / 1:00".format(recordingDuration),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Circular Camera Viewfinder with Hardware Oval Outline Provider & TextureView
                Box(
                    modifier = Modifier
                        .size(280.dp)
                        .clip(CircleShape)
                        .border(4.dp, Color.Red.copy(alpha = pulseAlpha), CircleShape)
                        .background(Color.Black)
                        .pointerInput(cameraControl) {
                            detectTransformGestures { _, _, zoom, _ ->
                                val targetZoom = (currentZoomRatio * zoom).coerceIn(minZoomRatio, maxZoomRatio)
                                currentZoomRatio = targetZoom
                                cameraControl?.setZoomRatio(targetZoom)
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx).apply {
                                // Force TextureView to respect clipping and avoid rectangular punch-through
                                implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                                scaleType = PreviewView.ScaleType.FILL_CENTER
                                layoutParams = FrameLayout.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                outlineProvider = object : ViewOutlineProvider() {
                                    override fun getOutline(view: View, outline: Outline) {
                                        outline.setOval(0, 0, view.width, view.height)
                                    }
                                }
                                clipToOutline = true
                            }

                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()

                                val preview = Preview.Builder().build().also {
                                    it.surfaceProvider = previewView.surfaceProvider
                                }

                                val qualitySelector = QualitySelector.from(
                                    Quality.SD,
                                    FallbackStrategy.lowerQualityOrHigherThan(Quality.SD)
                                )
                                val recorder = Recorder.Builder()
                                    .setQualitySelector(qualitySelector)
                                    .build()
                                val videoCapture = VideoCapture.withOutput(recorder)

                                val cameraSelector = if (isFrontCamera && cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)) {
                                    CameraSelector.DEFAULT_FRONT_CAMERA
                                } else {
                                    CameraSelector.DEFAULT_BACK_CAMERA
                                }

                                try {
                                    cameraProvider.unbindAll()
                                    val cam: Camera = cameraProvider.bindToLifecycle(
                                        lifecycleOwner,
                                        cameraSelector,
                                        preview,
                                        videoCapture
                                    )

                                    cameraControl = cam.cameraControl
                                    cameraInfo = cam.cameraInfo
                                    cam.cameraInfo.zoomState.value?.let { zs ->
                                        minZoomRatio = zs.minZoomRatio
                                        maxZoomRatio = zs.maxZoomRatio
                                    }

                                    // Prepare destination file
                                    val dir = File(ctx.cacheDir, "video_notes").apply { mkdirs() }
                                    val videoFile = File(dir, "note_${System.currentTimeMillis()}.mp4")
                                    currentOutputFile = videoFile

                                    val fileOutputOptions = FileOutputOptions.Builder(videoFile).build()
                                    val rec = videoCapture.output
                                        .prepareRecording(ctx, fileOutputOptions)
                                        .apply {
                                            try {
                                                withAudioEnabled()
                                            } catch (e: SecurityException) {
                                                Log.w("Camera", "Audio permission not granted for video note")
                                            }
                                        }
                                        .start(ContextCompat.getMainExecutor(ctx)) { event ->
                                            if (event is VideoRecordEvent.Finalize) {
                                                isRecordingActive = false
                                                if (!event.hasError()) {
                                                    val savedFile = currentOutputFile
                                                    if (savedFile != null && savedFile.exists() && savedFile.length() > 0) {
                                                        onVideoRecorded(savedFile)
                                                    } else {
                                                        onDismiss()
                                                    }
                                                } else {
                                                    Log.e("Camera", "Recording finalize error: ${event.error}")
                                                    currentOutputFile?.delete()
                                                    onDismiss()
                                                }
                                            }
                                        }
                                    recording = rec
                                    isRecordingActive = true
                                } catch (e: Exception) {
                                    Log.e("Camera", "Camera binding failed", e)
                                }
                            }, ContextCompat.getMainExecutor(ctx))

                            previewView
                        },
                        modifier = Modifier
                            .size(280.dp)
                            .clip(CircleShape)
                    )

                    if (isFinalizing) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.6f)),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 3.dp,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Camera Controls: Zoom Quick Toggle & Camera Flip
                Row(
                    horizontalArrangement = Arrangement.spacedBy(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Quick Zoom Button (1x / 2x)
                    IconButton(
                        onClick = {
                            val newZoom = if (currentZoomRatio < 1.8f) 2f else 1f
                            currentZoomRatio = newZoom
                            cameraControl?.setZoomRatio(newZoom)
                        },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Text(
                            text = if (currentZoomRatio < 1.8f) "1x" else "2x",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }

                    // Flip Camera (Front <-> Back)
                    IconButton(
                        onClick = {
                            isFrontCamera = !isFrontCamera
                            // Camera preview will automatically re-bind with new selector
                        },
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.FlipCameraAndroid,
                            contentDescription = "Switch Camera",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Bottom Action Buttons (Cancel / Stop & Send)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(40.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Cancel Button
                    IconButton(
                        onClick = {
                            stopAndFinish(sendVideo = false)
                        },
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Cancel",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    // Stop & Preview/Send Button
                    IconButton(
                        onClick = {
                            stopAndFinish(sendVideo = true)
                        },
                        enabled = !isFinalizing,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                    ) {
                        if (isFinalizing) {
                            CircularProgressIndicator(
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(24.dp)
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Rounded.Check,
                                contentDescription = "Finish and Preview",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
