import { useEffect, useRef, useState } from "react";

export default function CustomVideoPlayer({ src }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // iOS / Safari требования
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    // Пробуем показать первый кадр
    const tryPlay = async () => {
      try {
        await video.play();
        video.pause();
        video.currentTime = 0;
      } catch {
        // Safari может запретить autoplay — это нормально
      }
    };

    tryPlay();
  }, [src]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        video.muted = false;
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (e) {
      console.error("Video play error:", e);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 260,
        backgroundColor: "#000",
        borderRadius: 14,
        overflow: "hidden"
      }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        controls={false}
        style={{
          width: "100%",
          height: "100%",
          display: "block"
        }}
      />

      {/* Overlay play button */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          style={{
            position: "absolute",
            inset: 0,
            border: "none",
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: 42,
            cursor: "pointer"
          }}
          aria-label="Play video"
        >
          ▶
        </button>
      )}
    </div>
  );
}
