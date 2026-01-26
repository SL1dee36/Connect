import React, { useState, useRef, useEffect, useCallback } from 'react';
import './style/VideoPlayer.css';

const CustomVideoPlayer = ({ src, shape = 'circle', width = '240px', align = 'left', author, time }) => {
    const videoRef = useRef(null);
    const pathRef = useRef(null);
    const svgRef = useRef(null);
    const lastGlobalUpdate = useRef(0);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const [pathLength, setPathLength] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const shapePaths = {
        circle: "M 50, 4 A 46, 46 0 1, 1 49.9, 4", 
        square: "M 50, 4 H 96 V 96 H 4 V 4 H 50",
        triangle: "M 50, 6 L 94, 94 L 6, 94 Z",
        heart: "M 50, 25 C 50, 10 30, 4 15, 4 C 4, 4 4, 20 4, 35 C 4, 65 50, 96 50, 96 C 50, 96 96, 65 96, 35 C 96, 20 96, 4 85, 4 C 70, 4 50, 10 50, 25"
    };

    useEffect(() => {
        if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
    }, [shape]);

    useEffect(() => {
        const handleGlobalStateChange = (e) => {
            const activeData = e.detail;
            
            if (!activeData) return;

            if (activeData.id !== src) {
                if (isFocused) {
                    setIsFocused(false);
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.currentTime = 0;
                        videoRef.current.pause();
                        videoRef.current.playbackRate = 1;
                    }
                } else {
                    if (videoRef.current && !videoRef.current.paused) {
                        videoRef.current.pause();
                    }
                }
            }
        };

        window.addEventListener('video-update-state', handleGlobalStateChange);
        
        return () => {
            window.removeEventListener('video-update-state', handleGlobalStateChange);
        };
    }, [src, isFocused]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let frameId;

        const update = () => {
            if (!isDragging && video.duration) {
                setProgress(video.currentTime / video.duration);
            }

            if (isFocused) {
                const now = Date.now();
                if (now - lastGlobalUpdate.current > 500 || video.paused) { 
                    window.dispatchEvent(new CustomEvent('video-update-state', {
                        detail: {
                            id: src,
                            author: author || 'User',
                            time: time || '00:00',
                            isPlaying: !video.paused,
                            currentTime: video.currentTime,
                            speed: video.playbackRate
                        }
                    }));
                    lastGlobalUpdate.current = now;
                }
            }

            if (!video.paused) {
                frameId = requestAnimationFrame(update);
            }
        };

        if (isPlaying) {
            frameId = requestAnimationFrame(update);
        } else {
            update();
        }

        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, isDragging, isFocused, src, author, time]);

    const performSeek = useCallback((e) => {
        if (!svgRef.current || !videoRef.current || !isFocused) return;

        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;

        const x = clientX - centerX;
        const y = clientY - centerY;

        let newProgress;
        if (shape === 'circle') {
            let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            newProgress = angle / 360;
        } else {
            const clickX = clientX - rect.left;
            newProgress = Math.max(0, Math.min(1, clickX / rect.width));
        }

        setProgress(newProgress);
        videoRef.current.currentTime = newProgress * videoRef.current.duration;
    }, [isFocused, shape]);

    const handleToggleFocus = (e) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;

        if (!isFocused) {
            setIsFocused(true);
            video.muted = false;
            video.play().catch(() => {});

            window.dispatchEvent(new CustomEvent('video-update-state', {
                detail: {
                    id: src,
                    author: author || 'User',
                    time: time || '00:00',
                    isPlaying: true,
                    currentTime: video.currentTime,
                    speed: video.playbackRate
                }
            }));
        } else {
            if (video.paused) video.play();
            else video.pause();
        }
    };

    const dragStartTime = useRef(0);
    const hasMoved = useRef(false);

    const onStart = (e) => {
        if (!isFocused) {
            handleToggleFocus(e);
            return;
        }
        dragStartTime.current = Date.now();
        hasMoved.current = false;
        setIsDragging(true);
    };

    const onMove = (e) => {
        if (isDragging) {
            hasMoved.current = true;
            performSeek(e);
        }
    };

    const onEnd = (e) => {
        if (!isDragging) return;
        const duration = Date.now() - dragStartTime.current;
        if (!hasMoved.current && duration < 200) {
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
        }
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove);
            window.addEventListener('touchend', onEnd);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging]);

    const closeFocusHandler = useCallback(() => {
        setIsFocused(false);
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.currentTime = 0;
            video.muted = true;
            video.playbackRate = 1;
        }
        window.dispatchEvent(new CustomEvent('video-update-state', { detail: null }));
    }, []);

    useEffect(() => {
        const toggle = () => {
            if (!isFocused || !videoRef.current) return;
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
        };
        const seek = (e) => {
            if (!isFocused || !videoRef.current) return;
            videoRef.current.currentTime += e.detail;
        };
        const changeSpeed = () => {
            if (!isFocused || !videoRef.current) return;
            const rates = [1, 1.5, 2];
            const currentRate = videoRef.current.playbackRate;
            const nextRate = rates[(rates.indexOf(currentRate) + 1) % rates.length];
            videoRef.current.playbackRate = nextRate;
            lastGlobalUpdate.current = 0; 
        };

        window.addEventListener('video-toggle-play', toggle);
        window.addEventListener('video-seek', seek);
        window.addEventListener('video-change-speed', changeSpeed);
        window.addEventListener('video-close-focus', closeFocusHandler);

        return () => {
            window.removeEventListener('video-toggle-play', toggle);
            window.removeEventListener('video-seek', seek);
            window.removeEventListener('video-change-speed', changeSpeed);
            window.removeEventListener('video-close-focus', closeFocusHandler);
        };
    }, [isFocused, closeFocusHandler]);

    useEffect(() => {
        const video = videoRef.current;
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        
        if (video) {
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
        }
        return () => {
            if (video) {
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
            }
        };
    }, []);

    const extraSpace = isFocused ? (parseInt(width) * 0.45) : 0;
    const tOrigin = align === 'right' ? 'top right' : 'top left';

    return (
        <div className="video-msg-wrapper" style={{ marginBottom: `${extraSpace}px` }}>
            <div 
                className={`video-focus-overlay ${isFocused ? 'active' : ''}`} 
                onClick={(e) => {
                    e.stopPropagation();
                    closeFocusHandler();
                }} 
            />
            
            <div 
                className={`video-msg-container ${isFocused ? 'focused' : ''}`}
                style={{ width: width, transformOrigin: tOrigin }}
            >
                <svg 
                    ref={svgRef}
                    className="video-seek-svg" 
                    viewBox="0 0 100 100"
                    onMouseDown={onStart}
                    onTouchStart={onStart}
                >
                    <path 
                        className="video-seek-bg"
                        d={shapePaths[shape] || shapePaths.circle}
                        style={{ opacity: isFocused ? 1 : 0 }}
                    />
                    <path 
                        ref={pathRef}
                        className="video-seek-progress"
                        d={shapePaths[shape] || shapePaths.circle}
                        strokeDasharray={pathLength}
                        strokeDashoffset={pathLength - (pathLength * progress)}
                        style={{ opacity: isFocused || isPlaying ? 1 : 0 }}
                    />
                </svg>

                <div className="video-clipper" style={{
                    clipPath: shape === 'circle' ? 'circle(48.5% at 50% 50%)' :
                              shape === 'triangle' ? 'polygon(50% 2%, 98% 98%, 2% 98%)' :
                              shape === 'heart' ? `path("${shapePaths.heart}")` : 'none',
                    borderRadius: shape === 'square' ? '12px' : '0'
                }}>
                    <video
                        ref={videoRef}
                        className="video-element"
                        src={src}
                        playsInline
                        muted
                        onClick={handleToggleFocus}
                    />
                </div>
            </div>
        </div>
    );
};

export default CustomVideoPlayer;