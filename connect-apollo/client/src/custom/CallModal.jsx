import React, { useState, useRef } from 'react';
import Icons from './svgmanager/icons.jsx';

// Слайдер ответа на входящий звонок
const SwipeToAnswer = ({ onAnswer }) => {
    const [sliderX, setSliderX] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    const trackRef = useRef(null);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);

    const handlePointerDown = (e) => {
        if (isAnswered) return;
        isDraggingRef.current = true;
        startXRef.current = e.clientX - sliderX;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current || isAnswered) return;
        const maxTrackWidth = trackRef.current ? trackRef.current.clientWidth - 54 : 200;
        const newX = Math.max(0, Math.min(maxTrackWidth, e.clientX - startXRef.current));
        setSliderX(newX);
    };

    const handlePointerUp = (e) => {
        if (!isDraggingRef.current || isAnswered) return;
        isDraggingRef.current = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}

        const maxTrackWidth = trackRef.current ? trackRef.current.clientWidth - 54 : 200;

        if (sliderX > maxTrackWidth * 0.7) {
            setSliderX(maxTrackWidth);
            setIsAnswered(true);
            onAnswer();
        } else {
            setSliderX(0);
        }
    };

    return (
        <div className="swipe-track" ref={trackRef}>
            <div
                className="swipe-thumb"
                style={{ transform: `translateX(${sliderX}px)` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <Icons.IconCallInComing />
            </div>
            <span className="swipe-text" style={{ opacity: Math.max(0, 1 - sliderX / 120) }}>
                Проведите для ответа ➔
            </span>
        </div>
    );
};

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
    isIncoming,
    onSwitchCamera
}) => {
    const [isSwapped, setIsSwapped] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [facingMode, setFacingMode] = useState('user');
    const [speakerMode, setSpeakerMode] = useState('speaker');

    // 1. Позиция маленькой вебки ВНУТРИ полноэкранного режима
    const [pipPos, setPipPos] = useState({ x: 20, y: 180 });
    const isDraggingRef = useRef(false);
    const hasMovedRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPosRef = useRef({ x: 20, y: 180 });

    // 2. Позиция ВСЕГО СВЕРНУТОГО ОКОШКА (когда открыли чат)
    const [miniModalPos, setMiniModalPos] = useState({ x: 20, y: 80 });
    const isMiniDraggingRef = useRef(false);
    const miniDragStartRef = useRef({ x: 0, y: 0 });
    const initialMiniPosRef = useRef({ x: 20, y: 80 });

    if (callStatus === 'idle') return null;

    // Переключение фронтальная / задняя камера
    const handleFlipCamera = (e) => {
        e.stopPropagation();
        const nextMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(nextMode);
        if (onSwitchCamera) onSwitchCamera(nextMode);
    };

    // Сворачивание в плавающее окошко для чата
    const handleOpenChat = () => {
        setIsMinimized(true);
        if (!isMuted && toggleMute) {
            toggleMute(); // Выключает микрофон
        }
    };

    // Переключение динамика
    const handleToggleSpeaker = async () => {
        const nextMode = speakerMode === 'speaker' ? 'earpiece' : 'speaker';
        setSpeakerMode(nextMode);

        const videoEl = remoteVideoRef.current;
        if (videoEl && typeof videoEl.setSinkId === 'function') {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
                if (audioOutputs.length > 0) {
                    const targetId = nextMode === 'speaker' 
                        ? audioOutputs[0]?.deviceId 
                        : (audioOutputs[1]?.deviceId || audioOutputs[0]?.deviceId);
                    await videoEl.setSinkId(targetId || '');
                }
            } catch (err) {}
        }
    };

    // --- ДРАГ МАЛОЙ ВЕБКИ (В полноэкранном режиме) ---
    const handlePointerDown = (e) => {
        isDraggingRef.current = true;
        hasMovedRef.current = false;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialPosRef.current = { ...pipPos };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMovedRef.current = true;

        const newX = Math.max(10, Math.min(window.innerWidth - 130, initialPosRef.current.x - dx));
        const newY = Math.max(10, Math.min(window.innerHeight - 220, initialPosRef.current.y - dy));

        setPipPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}

        if (!hasMovedRef.current) {
            setIsSwapped(prev => !prev);
        }
    };

    // --- ДРАГ ВСЕГО СВЕРНУТОГО ОКОШКА (Над чатом) ---
    const handleMiniPointerDown = (e) => {
        // Если кликнули по кнопкам управления — не драгаем
        if (e.target.closest('button')) return;
        isMiniDraggingRef.current = true;
        miniDragStartRef.current = { x: e.clientX, y: e.clientY };
        initialMiniPosRef.current = { ...miniModalPos };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleMiniPointerMove = (e) => {
        if (!isMiniDraggingRef.current) return;
        const dx = e.clientX - miniDragStartRef.current.x;
        const dy = e.clientY - miniDragStartRef.current.y;

        const newX = Math.max(10, Math.min(window.innerWidth - 160, initialMiniPosRef.current.x - dx));
        const newY = Math.max(10, Math.min(window.innerHeight - 210, initialMiniPosRef.current.y - dy));

        setMiniModalPos({ x: newX, y: newY });
    };

    const handleMiniPointerUp = (e) => {
        isMiniDraggingRef.current = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    const isConnected = callStatus === 'connected';

    return (
        <div 
            className={`call-modal-overlay ${isMinimized ? 'minimized' : ''}`}
            style={isMinimized ? { right: `${miniModalPos.x}px`, bottom: `${miniModalPos.y}px` } : {}}
            onPointerDown={isMinimized ? handleMiniPointerDown : undefined}
            onPointerMove={isMinimized ? handleMiniPointerMove : undefined}
            onPointerUp={isMinimized ? handleMiniPointerUp : undefined}
        >
            <div className="call-content">
                
                {/* КНОПКИ УПРАВЛЕНИЯ ПОВЕРХ ПЛАВАЮЩЕГО ОКОШКА (КОГДА СВЕРНУТО) */}
                {isMinimized && (
                    <div className="mini-floating-controls">
                        <button className="mini-action-btn expand" onClick={() => setIsMinimized(false)} title="Развернуть">
                            <Icons.IconOpenVideoCall />
                        </button>
                        <button className="mini-action-btn end" onClick={endCall} title="Завершить">
                            <Icons.IconCallOutGoing />
                        </button>
                    </div>
                )}

                <div className="video-grid">
                    {!isConnected && (
                        <div className="calling-placeholder">
                            <div className="calling-avatar">
                                {callerName ? callerName[0].toUpperCase() : '?'}
                            </div>
                            <div className="calling-status">
                                {isIncoming ? `${callerName} звонит...` : `Звонок ${callerName}...`}
                            </div>
                        </div>
                    )}

                    {/* 1. ПОТОК СВОЕЙ КАМЕРЫ (Теги НЕ пересоздаются!) */}
                    <div 
                        className={`video-wrapper ${isSwapped ? 'main-view' : 'pip-view'}`}
                        style={(!isSwapped && !isMinimized) ? { right: `${pipPos.x}px`, bottom: `${pipPos.y}px` } : {}}
                        onPointerDown={(!isSwapped && !isMinimized) ? handlePointerDown : undefined}
                        onPointerMove={(!isSwapped && !isMinimized) ? handlePointerMove : undefined}
                        onPointerUp={(!isSwapped && !isMinimized) ? handlePointerUp : undefined}
                    >
                        <video ref={localVideoRef} autoPlay playsInline muted className="video-element mirrored" />
                        {!isSwapped && !isMinimized && (
                            <button className="pip-camera-flip-btn" onClick={handleFlipCamera} title="Переключить камеру">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M9.37 5.51A7 7 0 0 0 4.05 13H1l4.55 5 4.45-5H7.05a5 5 0 0 1 4.19-5.19l-1.87-2.3M14.63 18.49A7 7 0 0 0 19.95 11H23l-4.55-5-4.45 5h2.95a5 5 0 0 1-4.19 5.19l1.87 2.3z"/></svg>
                            </button>
                        )}
                    </div>

                    {/* 2. ПОТОК СОБЕСЕДНИКА */}
                    <div 
                        className={`video-wrapper ${isSwapped ? 'pip-view' : 'main-view'}`}
                        style={(isSwapped && !isMinimized) ? { right: `${pipPos.x}px`, bottom: `${pipPos.y}px` } : {}}
                        onPointerDown={(isSwapped && !isMinimized) ? handlePointerDown : undefined}
                        onPointerMove={(isSwapped && !isMinimized) ? handlePointerMove : undefined}
                        onPointerUp={(isSwapped && !isMinimized) ? handlePointerUp : undefined}
                    >
                        <video ref={remoteVideoRef} autoPlay playsInline className="video-element" />
                        {isSwapped && !isMinimized && (
                            <button className="pip-camera-flip-btn" onClick={handleFlipCamera} title="Переключить камеру">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M9.37 5.51A7 7 0 0 0 4.05 13H1l4.55 5 4.45-5H7.05a5 5 0 0 1 4.19-5.19l-1.87-2.3M14.63 18.49A7 7 0 0 0 19.95 11H23l-4.55-5-4.45 5h2.95a5 5 0 0 1-4.19 5.19l1.87 2.3z"/></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* НИЖНЯЯ ПАНЕЛЬ (ПОКАЗЫВАЕТСЯ ТОЛЬКО В ПОЛНОЭКРАННОМ РЕЖИМЕ) */}
                {!isMinimized && (
                    <div className="call-controls-container">
                        {isConnected && (
                            <div className="controls-top-row">
                                <button className="control-row-btn" onClick={handleOpenChat} title="Свернуть в окошко над чатом">
                                    <Icons.IconMessage/>
                                    <span>Чат</span>
                                </button>

                                <button className={`control-row-btn ${speakerMode === 'speaker' ? 'active' : ''}`} onClick={handleToggleSpeaker} title="Переключить динамик">
                                    {speakerMode === 'speaker' ? (
                                        <Icons.IconSpeakers/>
                                    ) : (
                                        <Icons.IconSpeakersMobile/>
                                    )}
                                    <span>{speakerMode === 'speaker' ? 'Громкая' : 'Телефон'}</span>
                                </button>

                                <button className={`control-row-btn ${isVideoOff ? 'off' : ''}`} onClick={toggleVideo} title="Вкл/Выкл Камеру">
                                    <Icons.IconCamera />
                                    <span>{isVideoOff ? 'Вкл камеру' : 'Камера'}</span>
                                </button>

                                <button className={`control-row-btn ${isMuted ? 'off' : ''}`} onClick={toggleMute} title="Вкл/Выкл Микрофон">                                   
                                    {isMuted ? <Icons.IconCallMicOff /> : <Icons.IconCallMic />}
                                    <span>{isMuted ? 'Вкл микр' : 'Микрофон'}</span>
                                </button>
                            </div>
                        )}

                        <div className="controls-bottom-row">
                            {isIncoming && callStatus === 'receiving' ? (
                                <div className="incoming-swipe-container">
                                    <SwipeToAnswer onAnswer={answerCall} />
                                    <button className="decline-square-btn" onClick={endCall} title="Отклонить"><Icons.IconCallOutGoing /></button>
                                </div>
                            ) : (
                                <button className="big-call-btn decline full-width" onClick={endCall}>
                                    <Icons.IconCallOutGoing />
                                    <span>{callStatus === 'calling' ? 'Отменить звонок' : 'Завершить звонок'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CallModal;