import React, { useState, useRef, useEffect } from 'react';

const CustomVideoPlayer = ({ src, shape = 'circle', width = '240px' }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            // Autoplay muted on load for preview effect
            video.muted = true;
            video.playsInline = true;
            video.loop = true;
            video.play().catch(() => {}); // Autoplay might be blocked, that's okay
        }
    }, [src]);

    const getClipPath = () => {
        switch (shape) {
            case 'circle': return 'circle(50% at 50% 50%)';
            case 'square': return 'none';
            // This is an example path, you might need to adjust it
            case 'heart': return 'path("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")';
            case 'triangle': return 'polygon(50% 0%, 0% 100%, 100% 100%)';
            default: return 'circle(50% at 50% 50%)';
        }
    };
    
    const wrapperStyle = {
        position: 'relative',
        width: width,
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        cursor: 'pointer',
        clipPath: getClipPath(),
        backgroundColor: '#111',
        borderRadius: shape === 'circle' ? '50%' : '12px', // So container matches shape
    };
    
    const videoStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    };

    const handleClick = () => {
        const video = videoRef.current;
        if (!video) return;
        
        if (video.paused) {
            video.play().catch(e => console.error("Play failed", e));
        } else {
            // Toggle mute on click if it's already playing
            video.muted = !video.muted;
            setIsMuted(video.muted);
        }
    };
    
    useEffect(() => {
        const video = videoRef.current;
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        if(video) {
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
        }
        return () => {
            if(video) {
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
            }
        };
    }, []);

    return (
        <div 
            className="custom-video-wrapper"
            style={wrapperStyle}
            onClick={handleClick}
        >
            <video
                ref={videoRef}
                src={src}
                playsInline
                controls={false}
                style={videoStyle}
            />
            {(!isPlaying || isMuted) && (
                 <div className="play-overlay" style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'background-color 0.2s',
                    pointerEvents: 'none',
                 }}>
                    {isMuted && isPlaying ? 
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                    }
                 </div>
            )}
        </div>
    );
};

export default CustomVideoPlayer;