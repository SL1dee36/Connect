import React, { useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import CustomAudioPlayer from "./CustomAudioPlayer";
import CustomVideoPlayer from "./CustomVideoPlayer";
import InlineAnimatedEmoji from "./InlineAnimatedEmoji";
import { IconReply, IconCheck } from "./Icons";
import { getNotoEmojiUrls } from "./EmojiPickerPanel";

const MessageItem = React.memo(({ msg, username, display_name, setImageModalSrc, onContextMenu, onReplyTrigger, scrollToMessage, onMentionClick }) => {
    const isMine = msg.author === username;
    const [translateX, setTranslateX] = useState(0);
    const [isLongPress, setIsLongPress] = useState(false);
    
    const touchStartRef = useRef(null);
    const touchCurrentRef = useRef(null);
    const longPressTimerRef = useRef(null);

    const noEmojiStr = msg.type === 'text' 
        ? msg.message.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\s]/gu, '') 
        : '';
    
    const isEmojiOnlyCandidate = msg.type === 'text' && noEmojiStr.length === 0 && msg.message.trim().length > 0;
    
    let emojiCount = 0;
    let graphemes =[];

    if (isEmojiOnlyCandidate) {
        try {
            const segmenter = new Intl.Segmenter('ru', { granularity: 'grapheme' });
            graphemes = Array.from(segmenter.segment(msg.message.replace(/\s/g, ''))).map(s => s.segment);
        } catch (e) {
            graphemes = msg.message.replace(/\s/g, '').match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu) ||[];
        }
        emojiCount = graphemes.length;
    }

    const isJumbo = emojiCount === 1;
    const isMedium = emojiCount >= 2 && emojiCount <= 3;
    const isTransparentBubble = isJumbo || isMedium; 

    let content;
    if (isTransparentBubble) {
        content = (
            <div className="emoji-only-container">
                {graphemes.map((em, i) => (
                    <InlineAnimatedEmoji 
                        key={i} 
                        nativeEmoji={em} 
                        autoAnimate={isJumbo} 
                        sizeClass={isJumbo ? 'jumbo' : 'medium'} 
                    />
                ))}
            </div>
        );
    } else if (msg.type === 'video') {
        let videoData = { url: msg.message, shape: 'circle' };
        try {
            const parsed = JSON.parse(msg.message);
            if (parsed.url) videoData = parsed;
        } catch (e) {
            videoData.url = msg.message;
        }
        
        content = (
            <CustomVideoPlayer 
                src={videoData.url} 
                shape={videoData.shape || 'circle'} 
                width="240px" 
                align={isMine ? 'right' : 'left'}
                author={msg.author_display_name || msg.author}
                time={msg.time}
            />
        );
    } else if (msg.type === 'image') {
        content = <img src={msg.message} alt="attachment" className="chat-image" loading="lazy" onClick={() => setImageModalSrc(msg.message)} />;
    } else if (msg.type === 'gallery') {
        const images = JSON.parse(msg.message);
        content = (
            <div className="gallery-grid">
                {images.map((img, i) => <img key={i} src={img} alt="gallery" className="gallery-image" loading="lazy" onClick={() => setImageModalSrc(img)} />)}
            </div>
        );
    } else if (msg.type === 'audio') {
        content = <CustomAudioPlayer src={msg.message} />;
    } else {
        const processedText = msg.message.replace(/@(\w+)/g, '[@$1]($1)');

        const renderAnimatedText = (text) => {
            if (typeof text !== 'string') return text;
            const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
            const parts = text.split(emojiRegex);
            
            return parts.map((part, index) => {
                if (part.match(emojiRegex)) {
                    return <InlineAnimatedEmoji key={index} nativeEmoji={part} sizeClass="inline" />;
                }
                return part;
            });
        };

        const parseChildrenWithEmojis = (children) => {
            return React.Children.map(children, child => {
                if (typeof child === 'string') return renderAnimatedText(child);
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, {
                        children: parseChildrenWithEmojis(child.props.children)
                    });
                }
                return child;
            });
        };

        content = (
            <div className="markdown-content">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                        a: ({node, ...props}) => {
                            const isMention = props.children?.[0]?.toString().startsWith('@');
                            if (isMention) {
                                return (
                                    <span className="mention-link" onClick={(e) => { e.stopPropagation(); onMentionClick(props.href); }}>
                                        {props.children}
                                    </span>
                                );
                            }
                            return <a {...props} target="_blank" rel="noreferrer">{props.children}</a>
                        },
                        p: ({node, ...props}) => <p style={{margin: '0 0 8px 0'}}>{parseChildrenWithEmojis(props.children)}</p>,
                        li: ({node, ...props}) => <li>{parseChildrenWithEmojis(props.children)}</li>,
                        span: ({node, ...props}) => <span>{parseChildrenWithEmojis(props.children)}</span>,
                        h3: ({node, ...props}) => <h3 style={{margin: '10px 0 5px 0', fontSize: '1.1em'}}>{parseChildrenWithEmojis(props.children)}</h3>,
                        ul: ({node, ...props}) => <ul style={{paddingLeft: '20px', margin: '5px 0'}} {...props} />,
                        ol: ({node, ...props}) => <ol style={{paddingLeft: '20px', margin: '5px 0'}} {...props} />
                    }}
                >
                    {processedText}
                </ReactMarkdown>
            </div>
        );
    }

    const handleTouchStart = (e) => {
        touchStartRef.current = e.touches[0].clientX;
        touchCurrentRef.current = e.touches[0].clientX;

        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

        longPressTimerRef.current = setTimeout(() => {
            setIsLongPress(true); 
            const touch = e.touches[0];
            onContextMenu(e, msg, touch.clientX, touch.clientY);
            if (window.navigator.vibrate) window.navigator.vibrate(50); 
        }, 800); 
    };

    const handleTouchMove = (e) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartRef.current;
        
        if (Math.abs(diffX) > 10 || Math.abs(currentY - touchStartRef.current) > 10) {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        }

        if (!isLongPress && diffX < 0 && diffX > -150 && !longPressTimerRef.current) {
            setTranslateX(diffX);
        }
    }; 

    const handleTouchEnd = (e) => {
        clearTimeout(longPressTimerRef.current);
        
        if (isLongPress) { 
            if (e.cancelable) e.preventDefault(); 
            setIsLongPress(false); 
            return; 
        }

        if (translateX < -80) { 
            if (window.navigator.vibrate) window.navigator.vibrate(10); 
            onReplyTrigger(msg); 
        }
        setTranslateX(0);
    };
    
    const handleRightClick = (e) => { e.preventDefault(); onContextMenu(e, msg, e.clientX, e.clientY); };

    return (
        <div 
            id={`message-${msg.id}`}
            className={`message ${isMine ? "mine" : "theirs"}`} 
            style={{ opacity: msg.status === 'pending' || msg.status === 'uploading' ? 0.7 : 1, position: 'relative' }}
            onContextMenu={handleRightClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div style={{
                position: 'absolute', left: isMine ? 'auto' : -40, right: isMine ? -40 : 'auto', top: '50%', transform: 'translateY(-50%)',
                opacity: Math.min(translateX / 80, 1), transition: 'opacity 0.2s', color: '#888'
            }}>
                <IconReply />
            </div>

            <div className={`bubble-container ${isLongPress ? 'long-press-active' : ''}`} style={{ transform: `translateX(${translateX}px)`, transition: translateX === 0 ? 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none' }}>
                <div className={`bubble ${msg.type === 'video' ? 'video-bubble' : ''} ${isTransparentBubble ? 'transparent-bubble' : ''}`}>
                    <span className="meta-name" style={{display:'flex', alignItems:'center', gap: '4px'}}>
                        {msg.author_display_name || msg.author}
                        {msg.author_badges && msg.author_badges.map((b, i) => (
                            <span key={i} title={b.name} style={{width: '14px', height: '14px', display:'inline-flex'}} dangerouslySetInnerHTML={{__html: b.svg_content}} />
                        ))}
                    </span>
                    {msg.reply_to_id && (
                        <div className="reply-preview-bubble" onClick={() => scrollToMessage(msg.reply_to_id)}>
                            <div className="reply-content">
                                <span className="reply-author">{msg.reply_to_author}</span>
                                <span className="reply-text-preview">
                                    {msg.reply_to_message?.includes('uploads/') ? '📷 Вложение' : msg.reply_to_message}
                                </span>
                            </div>
                        </div>
                    )}
                    {msg.status === 'uploading' ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: 10}}>
                             <div className="spinner" style={{width: 14, height: 14, borderWidth: 2}}></div>
                             <span>Загрузка...</span>
                        </div>
                    ) : content}
                    <span className="meta">{msg.time}{isMine && msg.status === 'sent' && <IconCheck />}</span>
                </div>
            </div>
        </div>
    );
});

export default MessageItem;