import React from 'react';

const CallModal = ({ 
    callStatus, 
    localVideoRef, 
    remoteVideoRef, 
    callerName, 
    answerCall, 
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
    isIncoming
}) => {
    if (callStatus === 'idle') return null;

    return (
        <div className="call-modal-overlay">
            <div className="call-content">
                
                {/* Видео сетка */}
                <div className="video-grid">
                    {/* Мое видео (маленькое) */}
                    <div className="local-video-wrapper">
                        <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
                        <div className="video-label">Вы</div>
                    </div>

                    {/* Видео собеседника (большое) */}
                    <div className="remote-video-wrapper">
                        {callStatus === 'connected' ? (
                             <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
                        ) : (
                            <div className="calling-placeholder">
                                <div className="calling-avatar">
                                    {callerName ? callerName[0].toUpperCase() : '?'}
                                </div>
                                <div className="calling-status">
                                    {isIncoming ? `${callerName} звонит...` : `Звонок ${callerName}...`}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Панель управления */}
                <div className="call-controls">
                    {isIncoming && callStatus === 'receiving' ? (
                        <>
                            <button className="call-btn accept" onClick={answerCall}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                            </button>
                            <button className="call-btn decline" onClick={endCall}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 11H8c-.55 0-1-.45-1-1s.45-1 1-1h8c.55 0 1 .45 1 1s-.45 1-1 1zm1 4H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1z"/></svg>
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={`call-btn ${isMuted ? 'active' : ''}`} onClick={toggleMute}>
                                {isMuted ? "Вкл Микр" : "Выкл Микр"}
                            </button>
                            <button className={`call-btn ${isVideoOff ? 'active' : ''}`} onClick={toggleVideo}>
                                {isVideoOff ? "Вкл Видео" : "Выкл Видео"}
                            </button>
                            <button className="call-btn decline" onClick={endCall}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72-.31.1-.51.42-.44.75l.66 3.05c.09.43.51.7.93.61 1-.22 2.05-.33 3.45-.33s2.45.11 3.45.33c.42.09.84-.18.93-.61l.66-3.05c.07-.32-.13-.65-.44-.75C15.15 9.25 13.6 9 12 9z"/></svg>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallModal;