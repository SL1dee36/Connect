import React, { useState, useRef, useEffect } from 'react';

const DynamicWaveformPlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [waveform, setWaveform] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const audioRef = useRef(null);
    const waveformRef = useRef(null); // Ref для контейнера волны

    useEffect(() => {
        if (!src) return;

        const generateWaveform = async () => {
            setIsLoading(true);

            // Ждем, пока контейнер волны не будет отрисован и не получит ширину благодаря CSS
            if (!waveformRef.current || waveformRef.current.offsetWidth === 0) {
                // Если ширина еще 0, попробуем еще раз через мгновение
                setTimeout(generateWaveform, 50);
                return;
            }
            
            try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                const bufferDuration = audioBuffer.duration;
                setDuration(bufferDuration);

                // --- ФИНАЛЬНАЯ ЛОГИКА РАСЧЕТА КОЛИЧЕСТВА СТОЛБИКОВ ---

                // 1. Рассчитываем физический лимит столбиков, исходя из реальной ширины контейнера волны.
                //    Каждый столбик = 2px ширина + 1px отступ = 3px
                const availableWidth = waveformRef.current.offsetWidth - 24;
                const maxBarsByWidth = Math.floor(availableWidth / 3);
                
                // 2. Рассчитываем желаемое кол-во столбиков по длине аудио (ваша улучшенная формула).
                const desiredBarsByDuration = Math.min(120, 40 + Math.floor(bufferDuration * 2));
                
                // 3. Выбираем меньшее из двух значений. Это гарантирует, что мы НИКОГДА
                //    не выйдем за пределы контейнера, но при этом волна будет расти с длиной аудио.
                const calculatedBars = Math.max(1, Math.min(desiredBarsByDuration, maxBarsByWidth));


                const rawData = audioBuffer.getChannelData(0); 
                const samplesPerBar = Math.floor(rawData.length / calculatedBars);
                const peaks = [];

                for (let i = 0; i < calculatedBars; i++) {
                    let max = 0;
                    for (let j = 0; j < samplesPerBar; j++) {
                        const sampleIndex = i * samplesPerBar + j;
                        if (sampleIndex < rawData.length) {
                             const peak = Math.abs(rawData[sampleIndex]);
                             if (peak > max) max = peak;
                        }
                    }
                    // Высота полоски от 4px до 24px
                    peaks.push(Math.max(4, max * 24)); 
                }
                
                setWaveform(peaks);
                setIsLoading(false);
            } catch (err) {
                console.error("Ошибка генерации волны:", err);
                setWaveform(new Array(30).fill(5)); // Фоллбэк в случае ошибки
                setIsLoading(false);
            }
        };

        generateWaveform();
    }, [src]); // Запускаем только при смене src

    const formatTime = (time) => {
        if (isNaN(time) || time === Infinity) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        if (!waveformRef.current) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        if (audioRef.current && !isNaN(audioRef.current.duration)) {
            audioRef.current.currentTime = percentage * audioRef.current.duration;
        }
    };

    return (
        <div className="tg-audio-player">
            <audio 
                ref={audioRef} 
                src={src} 
                onTimeUpdate={() => setCurrentTime(audioRef.current.currentTime)} 
                onEnded={() => setIsPlaying(false)}
                onLoadedData={() => setDuration(audioRef.current.duration)}
            />
            
            <button className="tg-play-btn" onClick={togglePlay}>
                {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#000000" d="M10 4H5v16h5V4zm9 0h-5v16h5V4z"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#000000" d="M10 20H8V4h2v2h2v3h2v2h2v2h-2v2h-2v3h-2v2z"/></svg>
                )}
            </button>

            <div className="tg-audio-info">
                <div 
                    className="tg-waveform" 
                    ref={waveformRef}
                    onClick={handleSeek} 
                >
                    {isLoading ? (
                        <div className="tg-loading-wave">...</div>
                    ) : (
                        waveform.map((height, i) => {
                            const barProgress = (i / waveform.length) * 100;
                            const currentProgress = (duration > 0 ? (currentTime / duration) : 0) * 100;
                            const isActive = barProgress < currentProgress;
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
                    <span>{formatTime(duration)}</span> 
                    <span>Голосовое сообщение</span>
                </div>
            </div>
        </div>
    );
};

export default DynamicWaveformPlayer;