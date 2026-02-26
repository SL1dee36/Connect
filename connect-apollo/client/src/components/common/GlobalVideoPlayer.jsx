import React from 'react';

const GlobalVideoPlayer = ({ activeVideo, onTogglePlay, onClose, onSeek, onSpeedChange }) => {
    if (!activeVideo) return null;

    const formatTime = (time) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="global-video-player">
            <div className="player-controls">
                {/* Back 5s */}
                <button className="player-btn" onClick={() => onSeek(-5)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                </button>
                
                {/* Play/Pause */}
                <button className="player-btn" onClick={onTogglePlay} style={{color: '#fff'}}>
                    {activeVideo.isPlaying ? 
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> :
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    }
                </button>

                {/* Forward 5s */}
                <button className="player-btn" onClick={() => onSeek(5)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                </button>
            </div>

            <div className="player-info">
                <div className="player-author">{activeVideo.author} today at {activeVideo.time}</div>
                <div className="player-status">Видео сообщение</div>
            </div>

            <div className="player-right-meta">
                <span>{formatTime(activeVideo.currentTime)}</span>
                
                <button className="player-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                </button>

                <button className="player-btn speed-btn" onClick={onSpeedChange}>
                    {activeVideo.speed}X
                </button>

                <button className="player-btn" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
        </div>
    );
};

export default GlobalVideoPlayer;