import React, { useRef, useState, useEffect } from 'react';

// Определения форм для SVG (для сложных фигур, которые нельзя сделать через CSS basic shapes)
const SvgShapesDefinitions = () => (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
            <clipPath id="shape-heart" clipPathUnits="objectBoundingBox">
                <path d="M0.5,0.92 L0.46,0.88 C0.2,0.65 0.03,0.48 0.03,0.28 C0.03,0.12 0.15,0 0.31,0 C0.4,0 0.49,0.04 0.5,0.11 C0.51,0.04 0.6,0 0.69,0 C0.85,0 0.97,0.12 0.97,0.28 C0.97,0.48 0.8,0.65 0.54,0.88 L0.5,0.92 Z" />
            </clipPath>
            <clipPath id="shape-hexagon" clipPathUnits="objectBoundingBox">
                 <polygon points="0.5 0, 1 0.25, 1 0.75, 0.5 1, 0 0.75, 0 0.25" />
            </clipPath>
        </defs>
    </svg>
);

const CustomVideoPlayer = ({ src, shape = 'circle', width = '260px', className = '' }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // По умолчанию видео со звуком, но можно менять

    // Словарь стилей обрезки
    const clipStyles = {
        circle: { clipPath: 'circle(50% at 50% 50%)', borderRadius: '50%' },
        square: { clipPath: 'inset(0% round 20px)', borderRadius: '20px' }, // Скругленный квадрат (как в iOS)
        triangle: { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
        heart: { clipPath: 'url(#shape-heart)' }, // Ссылка на SVG Defs
        hexagon: { clipPath: 'url(#shape-hexagon)' }
    };

    // Определяем стиль контейнера
    const containerStyle = {
        width: width,
        height: width, // Квадратный аспект
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        // Применяем маску к контейнеру
        ...(clipStyles[shape] || clipStyles.circle),
        // Небольшая тень для выделения на фоне чата (работает лучше с border-radius, чем с clip-path, но попробуем)
        filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))',
        backgroundColor: '#000' // Фон, пока грузится видео
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(!isMuted);
    };

    useEffect(() => {
        // Автовоспроизведение при появлении (опционально)
        // Для видео-сообщений обычно удобно автоплей без звука или с ним
        if (videoRef.current) {
            // videoRef.current.play().catch(() => { /* Auto-play blocked */ });
            // setIsPlaying(true);
        }
    }, []);

    return (
        <div className={`custom-video-wrapper ${className}`} style={{ display: 'inline-block' }}>
            {/* Вставляем SVG определения один раз (можно вынести в App.js, но тут надежнее) */}
            <SvgShapesDefinitions />

            <div style={containerStyle} onClick={togglePlay}>
                <video
                    ref={videoRef}
                    src={src}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover', // Важно: заполняет фигуру
                        display: 'block'
                    }}
                    playsInline
                    loop
                    muted={isMuted}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />

                {/* Оверлей кнопки Play (показываем, если пауза) */}
                {!isPlaying && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2
                    }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Индикатор звука (опционально, в углу) */}
                <div 
                    onClick={toggleMute}
                    style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px', // Центрируем по горизонтали относительно формы, если нужно, но right проще
                        width: '24px',
                        height: '24px',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 3,
                        cursor: 'pointer'
                    }}
                >
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomVideoPlayer;