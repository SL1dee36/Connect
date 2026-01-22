import React, { useState, useRef, useEffect } from 'react';

const DynamicWaveformPlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [waveform, setWaveform] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const audioRef = useRef(null);

    useEffect(() => {
        const generateWaveform = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                const bufferDuration = audioBuffer.duration;
                setDuration(bufferDuration);

                // ВЫЧИСЛЯЕМ КОЛИЧЕСТВО ПОЛОСОК
                // Минимум 25, максимум 100. Примерно 2.5 полоски на каждую секунду звука.
                const calculatedBars = Math.min(100, Math.max(60, Math.floor(bufferDuration * 2.5)));
                
                const rawData = audioBuffer.getChannelData(0); 
                const samplesPerBar = Math.floor(rawData.length / calculatedBars);
                const peaks = [];

                for (let i = 0; i < calculatedBars; i++) {
                    let max = 0;
                    for (let j = 0; j < samplesPerBar; j++) {
                        const peak = Math.abs(rawData[i * samplesPerBar + j]);
                        if (peak > max) max = peak;
                    }
                    // Высота полоски от 4px до 24px
                    peaks.push(Math.max(4, max * 30)); 
                }
                
                setWaveform(peaks);
                setIsLoading(false);
            } catch (err) {
                console.error("Ошибка генерации волны:", err);
                setWaveform(new Array(30).fill(5));
                setIsLoading(false);
            }
        };

        generateWaveform();
    }, [src]);

    const formatTime = (time) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        if (audioRef.current.duration) {
            audioRef.current.currentTime = percentage * audioRef.current.duration;
        }
    };

    return (
        <div className="tg-audio-player" style={{ width: 'fit-content' }}>
            <audio 
                ref={audioRef} 
                src={src} 
                onTimeUpdate={() => setCurrentTime(audioRef.current.currentTime)} 
                onEnded={() => setIsPlaying(false)}
            />
            
            <button className="tg-play-btn" onClick={togglePlay}>
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#000000" d="M10 4H5v16h5V4zm9 0h-5v16h5V4z"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#000000" d="M10 20H8V4h2v2h2v3h2v2h2v2h-2v2h-2v3h-2v2z"/></svg>
                )}
            </button>

            <div className="tg-audio-info">
                {/* Ширина контейнера волны зависит от количества баров */}
                <div 
                    className="tg-waveform" 
                    onClick={handleSeek} 
                    style={{ width: waveform.length * 4 + 'px' }} 
                >
                    {isLoading ? (
                        <div className="tg-loading-wave">...</div>
                    ) : (
                        waveform.map((height, i) => {
                            const barProgress = (i / waveform.length) * 100;
                            const currentProgress = (currentTime / duration) * 100;
                            const isActive = barProgress <= currentProgress;
                            return (
                                <div 
                                    key={i} 
                                    className={`tg-bar ${isActive ? 'active' : ''}`} 
                                    style={{ height: `${height}px` }}
                                />
                            );
                        })
                    )}
                </div>
                <div className="tg-meta">
                    {formatTime(currentTime || duration)} <span>Голосовое сообщение</span>
                </div>
            </div>
        </div>
    );
};

export default DynamicWaveformPlayer;