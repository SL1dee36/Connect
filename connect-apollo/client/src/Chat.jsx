import React, { useEffect, useState, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from "./custom/Modal";
import CustomAudioPlayer from "./custom/CustomAudioPlayer";
import CustomVideoPlayer from "./custom/CustomVideoPlayer"; 
import GlobalVideoPlayer from "./custom/GlobalVideoPlayer";
import Cropper from 'react-easy-crop';
import { registerPushNotifications } from "./custom/pushSubscription";
import rehypeSanitize from 'rehype-sanitize';
import AdminPanel from "./AdminPanel";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const IconClock = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 4, display: 'inline-block', verticalAlign: 'middle'}}>
        <path fill="currentColor" d="M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18Zm11-9c0 6.075-4.925 11-11 11S1 18.075 1 12S5.925 1 12 1s11 4.925 11 11Zm-8 4.414l-4-4V5.5h2v6.086L16.414 15L15 16.414Z"/>
    </svg>
);
const IconCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 4, display: 'inline-block', verticalAlign: 'middle'}}>
        <path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19L21 7l-1.4-1.4L9 16.2z"/>
    </svg>
);
const IconReply = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
         <path fill="#ffffff" d="M18 8H8V6H6v2H4v2h2v2h2v-2h10v10h2V8h-2zM8 12v2h2v-2H8zm0-6V4h2v2H8z"/>
    </svg>
);
const IconCopy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path fill="#ffffff" d="M4 2h11v2H6v13H4V2zm4 4h12v16H8V6zm2 2v12h8V8h-8z"/>
    </svg>
);
const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M5 3H3v18h18V3H5zm14 2v14H5V5h14zm-3 6H8v2h8v-2z"/></svg>
);
const IconBell = ({ hasUnread }) => (
    <div style={{ position: 'relative', cursor: 'pointer', display: 'flex' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M14 4V2h-4v2H5v2h14V4h-5zm5 12H5v-4H3v6h5v4h2v-4h4v2h-4v2h6v-4h5v-6h-2V6h-2v8h2v2zM5 6v8h2V6H5z"/></svg>
        {hasUnread && (
            <span style={{
                position: 'absolute', top: -2, right: -2, width: 8, height: 8,
                background: '#ff4d4d', borderRadius: '50%', border: '2px solid #1e1e1e'
            }}/>
        )}
    </div>
);
const IconShare = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M22 2h-2v2h2v12h-2v2h2v-2h2V4h-2V2ZM2 4H0v12h2v2h2v-2H2V4Zm0 0V2h2v2H2Zm4 2H4v8h2V6Zm0 0V4h2v2H6Zm4 0h4v2h-4V6Zm0 6H8V8h2v4Zm4 0h-4v2H8v4H6v4h2v-4h2v-4h4v4h2v4h2v-4h-2v-4h-2v-2Zm0 0h2V8h-2v4Zm6-6h-2V4h-2v2h2v8h2V6Z"/></svg>
);
const IconBug = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M8 2h2v4h4V2h2v4h2v3h2v2h-2v2h4v2h-4v2h2v2h-2v3H6v-3H4v-2h2v-2H2v-2h4v-2H4V9h2V6h2V2Zm8 6H8v3h8V8Zm-5 5H8v7h3v-7Zm2 7h3v-7h-3v7ZM4 9H2V7h2v2Zm0 10v2H2v-2h2Zm16 0h2v2h-2v-2Zm0-10V7h2v2h-2Z"/></svg>
);
const IconShield = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M22 2H2v12h2V4h16v10h2V2zM6 14H4v2h2v-2zm0 2h2v2h2v2H8v-2H6v-2zm4 4v2h4v-2h2v-2h-2v2h-4zm10-6h-2v2h-2v2h2v-2h2v-2z"/></svg>
);
const IconMic = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M12.9975 4H15V2H12.9975H11.0025H9V4H11.0025H12.9975Z M12.9975 15H15V13H12.9975H11.0025H9V15H11.0025H12.9975Z M13.33 18H16V16H13.33H10.67H8V18H10.67H13.33ZM13.33 22H16V20H13.33H10.67H8V22H10.67H13.33ZM15 6.24895V7.37553V8.49789V9.62447V10.7511V11.8734V13H17V11.8734V10.7511V9.62447V8.49789V7.37553V6.24895V5.12236V4H15V5.12236V6.24895ZM6 11H4V12.5V14H6V12.5V11ZM18 11V12.5V14H20V12.5V11H18ZM8 14H6V16H8V14ZM18 14H16V16H18V14ZM7 6.24895V7.37553V8.49789V9.62447V10.7511V11.8734V13H9V11.8734V10.7511V9.62447V8.49789V7.37553V6.24895V5.12236V4H7V5.12236V6.24895ZM11 18.4998V18.7501V18.9995V19.2499V19.5002V19.7496V20H13V19.7496V19.5002V19.2499V18.9995V18.7501V18.4998V18.2494V18H11V18.2494V18.4998Z"/></svg>
);
const IconPaperclip = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M5 5h16v10H7V9h10v2H9v2h10V7H5v10h14v2H3V5h2z"/> </svg>
);
const IconPin = () => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M11 4h2v8h2v2h-2v2h-2v-2H9v-2h2V4zm-2 8H7v-2h2v2zm6 0v-2h2v2h-2zM4 18h16v2H4v-2z"/></svg>
);
const IconFolder = () => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M4 4h8v2h10v14H2V4h2zm16 4H10V6H4v12h16V8z"/></svg>
);
const IconCheckCircle = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#2b95ff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
);
const IconDrag = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
         <path d="M20 6V4H4v2h16zm0 14v-2H4v2h16zM17 8v8h-2V8h2zm-8 6v-4h6V8H7v8h8v-2H9z" />
    </svg>
);
const IconCamera = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M2 5h14v4h2V7h2V5h2v14h-2v-2h-2v-2h-2v4H2V5zm2 12h10V7H4v10z"/></svg>
);

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const ContextMenu = ({ x, y, msg, onClose, onReply, onCopy, onDelete, canDelete }) => {
    return (
        <div 
            className="context-menu-container"
            style={{
                position: 'fixed', top: y, left: x, zIndex: 9999,
                background: '#252525', borderRadius: 8, border: '1px solid #333',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: 150
            }} 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()} 
        >
            <div className="menu-item" onClick={onReply} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'white'}}>
                <IconReply/> Ответить
            </div>
            <div className="menu-item" onClick={onCopy} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'white'}}>
                <IconCopy/> Копировать
            </div>
            {canDelete && (
                <div className="menu-item" onClick={onDelete} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#ff4d4d'}}>
                    <IconTrash/> Удалить
                </div>
            )}
        </div>
    );
};

const MessageItem = React.memo(({ msg, username, display_name, setImageModalSrc, onContextMenu, onReplyTrigger, scrollToMessage, onMentionClick }) => {
    const isMine = msg.author === username;
    const [translateX, setTranslateX] = useState(0);
    const [isLongPress, setIsLongPress] = useState(false);
    
    const touchStartRef = useRef(null);
    const touchCurrentRef = useRef(null);
    const longPressTimerRef = useRef(null);

    let content;
    if (msg.type === 'video') {
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
                                    <span 
                                        className="mention-link" 
                                        onClick={(e) => { e.stopPropagation(); onMentionClick(props.href); }}
                                    >
                                        {props.children}
                                    </span>
                                );
                            }
                            return <a {...props} target="_blank" rel="noreferrer">{props.children}</a>
                        },
                        p: ({node, ...props}) => <p style={{margin: '0 0 8px 0'}} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{margin: '10px 0 5px 0', fontSize: '1.1em'}} {...props} />,
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
        const startY = e.touches[0].clientY;
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
            style={{ opacity: msg.status === 'pending' ? 0.7 : 1, position: 'relative' }}
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
                <div className={`bubble ${msg.type === 'video' ? 'video-bubble' : ''}`}>
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
                    {content}
                    <span className="meta">{msg.time}{isMine && msg.status === 'sent' && <IconCheck />}</span>
                </div>
            </div>
        </div>
    );
});


function Chat({ socket, username, room, setRoom, handleLogout }) {
    const [myChats, setMyChats] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_my_chats")) || []; } catch { return []; } });
    const [friends, setFriends] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_friends")) || []; } catch { return []; } });
    const [myProfile, setMyProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_my_profile")) || { bio: "", phone: "", avatar_url: "", display_name: "", notifications_enabled: 1 }; } catch { return { bio: "", phone: "", avatar_url: "", display_name: "", notifications_enabled: 1 }; } });
    const [chatPreviews, setChatPreviews] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_chat_previews")) || {}; } catch { return {}; } });

    const [globalRole, setGlobalRole] = useState('member'); 
    const [roomSettings, setRoomSettings] = useState({ is_private: 0, slow_mode: 0, avatar_url: '' });
    
    const [pinnedChats, setPinnedChats] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_pinned_chats")) || []; } catch { return []; } });
    const [folders, setFolders] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_folders")) || [{id: 'all', name: 'All', chatIds: []}]; } catch { return [{id: 'all', name: 'All', chatIds: []}]; } });
    const [activeFolderId, setActiveFolderId] = useState('all');
    const [customChatOrder, setCustomChatOrder] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_chat_order")) || []; } catch { return []; } });
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedChats, setSelectedChats] = useState([]);
    
    const [newFolderName, setNewFolderName] = useState("");
    const [folderToEdit, setFolderToEdit] = useState(null);

    const myProfileRef = useRef(myProfile);
    useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);

    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    const [activeModal, setActiveModal] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
    const [typingText, setTypingText] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showMobileChat, setShowMobileChat] = useState(false);
    
    const [replyingTo, setReplyingTo] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [imageModalSrc, setImageModalSrc] = useState(null);
    const [attachedFiles, setAttachedFiles] = useState([]); 
    const [totalNetworkUsers, setTotalNetworkUsers] = useState(0);

    const [newChatName, setNewChatName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchGroupResults, setSearchGroupResults] = useState([]);

    const [viewProfileData, setViewProfileData] = useState(null);
    const [profileForm, setProfileForm] = useState({ bio: "", phone: "", display_name: "", username: "", notifications_enabled: 1 });
    const [groupMembers, setGroupMembers] = useState([]);
    const [myRole, setMyRole] = useState("member");
    const [avatarHistory, setAvatarHistory] = useState([]);
    const [avatarEditor, setAvatarEditor] = useState({ isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 } });

    const [bugDescription, setBugDescription] = useState("");
    const [bugFiles, setBugFiles] = useState([]);
    const [adminBugList, setAdminBugList] = useState([]);

    const [inputMode, setInputMode] = useState('audio');
    const [isRecording, setIsRecording] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedMedia, setRecordedMedia] = useState(null);
    const [videoShape, setVideoShape] = useState('circle');
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const longPressTimeoutRef = useRef(null);
    
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const isSwipingToCancelRef = useRef(false);
    
    const liveVideoRef = useRef(null); 
    const streamRef = useRef(null);

    const [inAppNotif, setInAppNotif] = useState({ visible: false, title: '', body: '', avatar: null, room: '' });
    const inAppNotifTimeoutRef = useRef(null);

    const messagesEndRef = useRef(null);
    const chatBodyRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const previousScrollHeight = useRef(0);
    const textareaRef = useRef(null);
    
    const [activeMessageId, setActiveMessageId] = useState(null);
    const [swipeX, setSwipeX] = useState(0);
    const isSwiping = useRef(false);
    const startTouchX = useRef(0);
    
    const dragItemRef = useRef(null);
    const dragOverItemRef = useRef(null);
    const chatLongPressTimer = useRef(null);
    const [isMobileDragging, setIsMobileDragging] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState(null);

    const [activeVideoState, setActiveVideoState] = useState(null);

    useEffect(() => {
        const handleVideoUpdate = (e) => {
            setActiveVideoState(e.detail);
        };

        window.addEventListener('video-update-state', handleVideoUpdate);
        return () => window.removeEventListener('video-update-state', handleVideoUpdate);
    }, []);

    useEffect(() => { localStorage.setItem("apollo_pinned_chats", JSON.stringify(pinnedChats)); }, [pinnedChats]);
    useEffect(() => { localStorage.setItem("apollo_folders", JSON.stringify(folders)); }, [folders]);
    useEffect(() => { localStorage.setItem("apollo_chat_order", JSON.stringify(customChatOrder)); }, [customChatOrder]);
    useEffect(() => { localStorage.setItem("apollo_chat_previews", JSON.stringify(chatPreviews)); }, [chatPreviews]);

    const unifiedChatList = useMemo(() => {
        let all = [
            ...myChats.map(c => ({ 
                id: c,
                originalId: c,
                type: 'group', 
                name: c === 'General' ? 'Community Bot' : c, 
                avatar: null
            })),
            ...friends.map(f => {
                const friendUsername = f.username || f;
                const roomId = [username, friendUsername].sort().join("_");
                return { 
                    id: roomId, 
                    originalId: friendUsername,
                    type: 'dm', 
                    name: f.display_name || friendUsername, 
                    avatar: f.avatar_url 
                };
            })
        ];

        all = all.map(chat => ({
            ...chat,
            preview: chatPreviews[chat.id] || null
        }));
        
        if (activeFolderId !== 'all') {
            const currentFolder = folders.find(f => f.id === activeFolderId);
            if (currentFolder) {
                all = all.filter(c => currentFolder.chatIds.includes(c.originalId));
            }
        }

        all.sort((a, b) => {
            const isPinnedA = pinnedChats.includes(a.originalId);
            const isPinnedB = pinnedChats.includes(b.originalId);
            
            if (isPinnedA && !isPinnedB) return -1;
            if (!isPinnedA && isPinnedB) return 1;
    
            const idxA = customChatOrder.indexOf(a.originalId);
            const idxB = customChatOrder.indexOf(b.originalId);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
    
            const timeA = a.preview?.timestamp || 0;
            const timeB = b.preview?.timestamp || 0;
            return timeB - timeA;
        });
    
        return all;
    }, [myChats, friends, pinnedChats, activeFolderId, folders, customChatOrder, chatPreviews, username]);

    useEffect(() => {
        if (isMobile && showMobileChat) {
            window.history.pushState({ type: 'chat' }, '');
        }
    }, [showMobileChat, isMobile]);

    useEffect(() => {
        if (activeModal) {
            window.history.pushState({ type: 'modal' }, '');
        }
    }, [activeModal]);

    const handleCloseMobileChat = useCallback(() => {
        setShowMobileChat(false);
        setRoom(""); 
        localStorage.setItem("apollo_room", "");
    }, [setRoom]);

    useEffect(() => {
        const handlePopState = (e) => {
            if (activeModal) {
                setActiveModal(null);
            } 
            else if (showMobileChat) {
                handleCloseMobileChat();
            } else if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedChats([]);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activeModal, showMobileChat, handleCloseMobileChat, isSelectionMode]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedUser = params.get('user');
        if (sharedUser) {
            socket.emit("get_user_profile", sharedUser);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [socket]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const nextHeight = Math.min(textarea.scrollHeight, 150);
            textarea.style.height = `${nextHeight}px`;
        }
    }, [currentMessage]);

    useEffect(() => {
        const handleGlobalClose = (e) => {
            const menuElement = document.querySelector('.context-menu-container');
            if (menuElement && menuElement.contains(e.target)) return;
            setContextMenu(null);
            setActiveMessageId(null);
        };
        window.addEventListener('mousedown', handleGlobalClose);
        window.addEventListener('touchstart', handleGlobalClose);
        return () => {
            window.removeEventListener('mousedown', handleGlobalClose);
            window.removeEventListener('touchstart', handleGlobalClose);
        };
    }, []);

    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    }, []);

    const triggerInAppNotification = useCallback((title, body, avatar, roomName) => {
        if (inAppNotifTimeoutRef.current) clearTimeout(inAppNotifTimeoutRef.current);
        
        setInAppNotif({ visible: true, title, body, avatar, room: roomName });
        
        inAppNotifTimeoutRef.current = setTimeout(() => {
            setInAppNotif(prev => ({ ...prev, visible: false }));
        }, 3500); 
    }, []);

    const handleInAppNotifClick = () => {
        if (inAppNotif.room) switchChat(inAppNotif.room);
        setInAppNotif(prev => ({ ...prev, visible: false }));
    };

    const sendSystemNotification = useCallback((title, body, tag, roomName, avatarUrl) => {
        const currentProfile = myProfileRef.current;
        if (currentProfile.notifications_enabled === 0 || currentProfile.notifications_enabled === false) return; 
        
        triggerInAppNotification(title, body, avatarUrl, roomName);

        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            try {
                if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(title, {
                            body: body,
                            icon: '/icon-192.png', 
                            badge: '/icon-192.png',
                            tag: tag,
                            vibrate: [200, 100, 200], 
                            data: { room: roomName, url: window.location.href } 
                        });
                    });
                } else {
                    const notif = new Notification(title, { 
                        body, 
                        icon: '/icon-192.png', 
                        tag: tag 
                    });
                    notif.onclick = function() {
                        window.focus();
                        if(roomName) switchChat(roomName);
                        notif.close();
                    };
                }
            } catch (e) { console.error(e); }
        }
    }, [triggerInAppNotification]); 

    const requestMediaPermissions = async (type) => {
        try {
            const constraints = type === 'video' 
                ? { audio: true, video: { facingMode: "user" } } 
                : { audio: true };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            stream.getTracks().forEach(track => track.stop());
            alert("Доступ к " + (type === 'video' ? "камере и микрофону" : "микрофону") + " получен!");
        } catch (err) {
            console.error("Permission denied:", err);
            alert("Доступ отклонен или устройство не поддерживается.");
        }
    };

    const requestFilePermission = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = () => alert("Доступ к файлам подтвержден!");
        input.click();
    };

    const requestNotificationPermission = async () => {
        const token = localStorage.getItem("apollo_token");
        await registerPushNotifications(token);
        socket.emit("update_profile", { ...myProfile, notifications_enabled: true });
        
        if ("Notification" in window && Notification.permission === "granted") {
             if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification("Notifications Enabled", {
                        body: "Теперь вы будете получать уведомления даже если закроете приложение",
                        icon: '/icon-192.png',
                        vibrate: [200]
                    });
                });
            }
        }
    };

    useEffect(() => {
        const handleGlobalClick = () => setContextMenu(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();
        document.body.addEventListener('contextmenu', preventDefault);
        const preventZoom = (e) => { if (e.ctrlKey) e.preventDefault(); };
        window.addEventListener('wheel', preventZoom, { passive: false });
        window.addEventListener('keydown', (e) => { if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) e.preventDefault(); });
        return () => { document.body.removeEventListener('contextmenu', preventDefault); window.removeEventListener('wheel', preventZoom); };
    }, []);

    useEffect(() => localStorage.setItem("apollo_my_chats", JSON.stringify(myChats)), [myChats]);
    useEffect(() => localStorage.setItem("apollo_friends", JSON.stringify(friends)), [friends]);
    useEffect(() => localStorage.setItem("apollo_my_profile", JSON.stringify(myProfile)), [myProfile]);

    useEffect(() => {
        const handleDMNotification = (data) => {
            if (room === data.room) return;
            playNotificationSound();
            sendSystemNotification(data.author, data.message, 'dm', data.room, null);
        };

        socket.on("dm_notification", handleDMNotification);
        return () => {
            socket.off("dm_notification", handleDMNotification);
        };
    }, [socket, room, playNotificationSound, sendSystemNotification]);

    useEffect(() => {
        if (activeModal === 'notifications') {
            const unread = notifications.filter(n => !n.is_read);
            if (unread.length > 0) {
                unread.forEach(n => socket.emit("mark_notification_read", { id: n.id }));
                setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
                setHasUnreadNotifs(false);
            }
        }
    }, [activeModal, notifications, socket]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim()) {
                setIsSearching(true);
                if (activeModal === 'addFriend') socket.emit("search_users", searchQuery);
                else if (activeModal === 'searchGroup') socket.emit("search_groups", searchQuery);
            } else {
                setSearchResults([]);
                setSearchGroupResults([]);
                setIsSearching(false);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, activeModal, socket]);

    const createImage = useCallback((url) => new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    }), []);

    const getCroppedImg = useCallback(async (imageSrc, pixelCrop, filters) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px)`;
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        return new Promise((resolve) => { canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/webp', 0.8); });
    }, [createImage]);

    const handleDeleteMessage = useCallback((id) => { if (window.confirm("Удалить это сообщение?")) socket.emit("delete_message", id); }, [socket]);

    const handleContextMenu = useCallback((e, msg, x, y) => {
        setActiveMessageId(msg.id);
        
        let menuX = x;
        let menuY = y - 70; 

        if (menuX + 150 > window.innerWidth) menuX = window.innerWidth - 160;
        if (menuY < 50) menuY = y + 20; 
        if (menuY + 150 > window.innerHeight) menuY = window.innerHeight - 160;

        setContextMenu({ x: menuX, y: menuY, msg: msg });
    }, []);

    const handleReply = (msg) => { setReplyingTo(msg); textareaRef.current?.focus(); setContextMenu(null); };
    const handleCopy = (text) => { navigator.clipboard.writeText(text); setContextMenu(null); };

    const handleScrollToReply = (messageId) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlighted');
            setTimeout(() => { element.classList.remove('highlighted'); }, 1500);
        }
    };

    const startTouchY = useRef(0);

    const handleSwipeStart = (e) => {
        if (!isMobile || !showMobileChat) return;
        if (e.touches[0].clientX < 50) {
            startTouchX.current = e.touches[0].clientX;
            startTouchY.current = e.touches[0].clientY;
            isSwiping.current = true;
        }
    };

    const handleSwipeMove = (e) => {
        if (!isSwiping.current) return;
        
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startTouchX.current;
        const diffY = Math.abs(currentY - startTouchY.current);

        if (diffY > Math.abs(diffX) && diffX < 10) {
            isSwiping.current = false;
            setSwipeX(0);
            return;
        }

        if (diffX > 0) {
            if (e.cancelable) e.preventDefault();
            setSwipeX(diffX);
        }
    };

    const handleSwipeEnd = () => {
        if (!isSwiping.current) return;
        isSwiping.current = false;

        if (swipeX > window.innerWidth * 0.25) {
            setSwipeX(window.innerWidth);
            setTimeout(() => {
                window.history.back(); 
            }, 100);
        } else {
            setSwipeX(0);
        }
    };

    const switchChat = useCallback((targetName) => {
        if (isSelectionMode) return; 
        if (!targetName || typeof targetName !== 'string') return;
        
        const roomId = targetName;
        
        if (roomId !== room) { 
            setRoom(roomId); 
            localStorage.setItem("apollo_room", roomId); 
        }

        if (isMobile) { 
            setSwipeX(0); 
            setShowMobileChat(true); 
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); 
        }
    }, [room, setRoom, isMobile, isSelectionMode]);

    useEffect(() => {
        if (!showMobileChat) {
            setSwipeX(0);
            isSwiping.current = false;
        }
    }, [showMobileChat]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        
        const handleSearchResults = (results) => { 
            if (Array.isArray(results)) {
                setSearchResults(results.filter(u => u.username !== username));
            } else {
                setSearchResults([]);
            }
            setIsSearching(false); 
        };
        const handleSearchGroupResults = (results) => { 
             setSearchGroupResults(Array.isArray(results) ? results : []); 
             setIsSearching(false); 
        };

        const handleNotificationHistory = (history) => { setNotifications(history); setHasUnreadNotifs(history.some(n => !n.is_read)); };
        const handleNewNotification = (notif) => {
            setNotifications(prev => [notif, ...prev]);
            setHasUnreadNotifs(true);
            playNotificationSound();
            
            let title = "Новое уведомление";
            let body = notif.content;
            if (notif.type === 'friend_request') body = `Заявка в друзья от ${notif.content}`;
            if (notif.type === 'mention') { title = "Вас упомянули"; body = notif.content; }
            
            sendSystemNotification(title, body, 'system', notif.data, null);
        };

        const handleMyProfile = (data) => {
             setMyProfile({
                 ...data,
                 notifications_enabled: data.notifications_enabled === 1
             });
        };
        
        socket.on("global_role", (role) => setGlobalRole(role));
        
        socket.on("room_settings", (settings) => {
            setRoomSettings(settings);
            setMyRole(settings.myRole);
        });

        socket.on("room_settings_updated", (data) => {
            if(data.room === room) {
                setRoomSettings(prev => ({...prev, ...data}));
            }
        });
        
        socket.on("chat_previews_data", (data) => {
            if (typeof data === 'object' && data !== null) setChatPreviews(data);
        });
        socket.on("update_chat_preview", (data) => {
            setChatPreviews(prev => ({ ...prev, [data.room]: data.preview }));
        });

        socket.on("avatar_history_data", (data) => setAvatarHistory(data)); 
        socket.on("user_groups", (groups) => { if(Array.isArray(groups)) setMyChats(groups); });
        socket.on("friends_list", (list) => { if(Array.isArray(list)) setFriends(list); });
        socket.on("search_results", handleSearchResults);
        socket.on("search_groups_results", handleSearchGroupResults);
        socket.on("group_created", (data) => { setMyChats(prev => !prev.includes(data.room) ? [...prev, data.room] : prev); switchChat(data.room); setActiveModal(null); });
        socket.on("group_joined", (data) => { setMyChats(prev => !prev.includes(data.room) ? [...prev, data.room] : prev); switchChat(data.room); setActiveModal(null); });
        
        socket.on("left_group_success", (data) => { 
            setMyChats(prev => prev.filter(c => c !== data.room)); 
            if(room === data.room) setRoom(""); 
            setActiveModal(null); 
        });

        socket.on("group_deleted", (data) => { setMyChats(prev => prev.filter(c => c !== data.room)); if(localStorage.getItem("apollo_room") === data.room) switchChat(""); alert("Group Deleted"); });
        socket.on("friend_added", (data) => { setFriends(prev => [...prev, data.username]); alert(`${data.username} добавлен!`); });
        socket.on("friend_removed", (data) => { setFriends(prev => prev.filter(f => f !== data.username)); if(localStorage.getItem("apollo_room") === [username, data.username].sort().join("_")) switchChat(""); });
        socket.on("my_profile_data", handleMyProfile);
        
        socket.on("user_profile_data", (data) => { 
            setViewProfileData(data); 
            setActiveModal("userProfile"); 
            socket.emit("get_avatar_history", data.username); 
        });
        
        socket.on("notification_history", handleNotificationHistory);
        socket.on("new_notification", handleNewNotification);
        socket.on("error_message", (d) => alert(d.msg));
        socket.on("total_users", (count) => setTotalNetworkUsers(count));
        
        socket.on("force_logout", (d) => {
            alert(d.msg);
            handleLogout();
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            socket.off("global_role");
            socket.off("room_settings");
            socket.off("room_settings_updated");
            socket.off("user_groups");
            socket.off("friends_list");
            socket.off("search_results");
            socket.off("search_groups_results");
            socket.off("group_created");
            socket.off("group_joined");
            socket.off("left_group_success");
            socket.off("group_deleted");
            socket.off("friend_added");
            socket.off("friend_removed");
            socket.off("my_profile_data");
            socket.off("user_profile_data");
            socket.off("notification_history");
            socket.off("new_notification");
            socket.off("error_message");
            socket.off("force_logout");
            socket.off("total_users");
            socket.off("chat_previews_data");
            socket.off("update_chat_preview");
        };
    }, [socket, username, switchChat, playNotificationSound, sendSystemNotification, handleLogout, room]);

    useEffect(() => {
        if (username && socket) {
            socket.emit("get_initial_data"); 
            socket.emit("get_my_profile", username);
        }
    }, [socket, username]);

    useEffect(() => {
        if (!room) return;
        
        setMessageList([]);
        setHasMore(true);
        setTypingText("");
        setAttachedFiles([]);
        setCurrentMessage("");
        setReplyingTo(null);
        setIsLoadingHistory(true);
        setRoomSettings({ is_private: 0, slow_mode: 0, avatar_url: '' }); 
        
        socket.emit("join_room", { username, room });
        
        if (!room.includes("_")) {
            socket.emit("get_group_info", room);
        }

        const handleReceiveMessage = (data) => {
            setChatPreviews(prev => ({
                ...prev,
                [data.room]: {
                    text: data.message,
                    sender: data.author,
                    time: data.time,
                    timestamp: data.timestamp,
                    type: data.type
                }
            }));

             if (data.room === room) {
                setMessageList((list) => {
                    if (data.author === username && data.tempId) {
                         const exists = list.find(m => m.tempId === data.tempId);
                         if (exists) return list.map(m => m.tempId === data.tempId ? { ...data, status: 'sent' } : m);
                    }
                    return [...list, data];
                });
                if (data.author !== username && document.hidden) { 
                    playNotificationSound(); 
                    sendSystemNotification(data.author, data.message, 'dm', data.room, null); 
                }
             } else {
                if (data.author !== username) { 
                    playNotificationSound(); 
                    sendSystemNotification(data.author, data.message, 'dm', data.room, null); 
                }
             }
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("chat_history", (h) => { setMessageList(h.map(m => ({...m, status: 'sent'}))); setHasMore(h.length >= 30); setIsLoadingHistory(false); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50); });
        socket.on("more_messages_loaded", (h) => { setMessageList(p => [...h.map(m => ({...m, status: 'sent'})), ...p]); setHasMore(h.length >= 30); setIsLoadingHistory(false); });
        socket.on("no_more_messages", () => { setHasMore(false); setIsLoadingHistory(false); });
        
        socket.on("display_typing", (d) => { 
            if(d.room === room) { 
                setTypingText(`${d.username} печатает...`); 
                clearTimeout(typingTimeoutRef.current); 
                typingTimeoutRef.current = setTimeout(() => setTypingText(""), 3000); 
            } 
        });
        
        socket.on("group_info_data", (d) => { if(d.room === room) { setGroupMembers(d.members); } });
        socket.on("group_info_updated", (data) => { if(room === data.members?.[0]?.room) setGroupMembers(data.members); });
        socket.on("message_deleted", (id) => setMessageList((prev) => prev.filter((msg) => msg.id !== id)));

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("chat_history");
            socket.off("more_messages_loaded");
            socket.off("no_more_messages");
            socket.off("display_typing");
            socket.off("group_info_data");
            socket.off("group_info_updated");
            socket.off("message_deleted");
        };
    }, [room, socket, username, playNotificationSound, sendSystemNotification]);

    useEffect(() => {
        if (previousScrollHeight.current === 0 && messageList.length > 0) {
            const lastMsg = messageList[messageList.length - 1];
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        if (previousScrollHeight.current > 0) {
            setTimeout(() => { previousScrollHeight.current = 0; }, 100);
        }
    }, [messageList]);

    useLayoutEffect(() => {
        if (chatBodyRef.current && previousScrollHeight.current !== 0) {
            const diff = chatBodyRef.current.scrollHeight - previousScrollHeight.current;
            if (diff > 0) chatBodyRef.current.scrollTop = diff;
        }
    }, [messageList]);

    const handleScroll = (e) => {
        if (e.target.scrollTop === 0 && hasMore && !isLoadingHistory && messageList.length > 0) {
            setIsLoadingHistory(true);
            previousScrollHeight.current = e.target.scrollHeight;
            socket.emit("load_more_messages", { room, offset: messageList.length });
        }
    };

    const onFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => setAvatarEditor(prev => ({ ...prev, image: reader.result, isOpen: true })), false);
            reader.readAsDataURL(file);
            setActiveModal(null);
        }
    };
    const handleSaveAvatar = async () => {
        if (!avatarEditor.croppedAreaPixels) return;
        const croppedImageBlob = await getCroppedImg(avatarEditor.image, avatarEditor.croppedAreaPixels, avatarEditor.filters);
        const formData = new FormData();
        formData.append('avatar', croppedImageBlob, 'avatar.webp');
        formData.append('username', username);
        try {
            const res = await fetch(`${BACKEND_URL}/upload-avatar`, { method: 'POST', body: formData });
            const data = await res.json();
            if(data.profile) {
                setMyProfile(prev => ({...prev, ...data.profile}));
                socket.emit("get_avatar_history", username);
            }
        } catch (error) {
            console.error(error);
        } finally { 
            setAvatarEditor({ 
                isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, 
                filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 }
            }); 
        }
    };

    const lastTouchTimeRef = useRef(0);
    const recordingTimeRef = useRef(0);
    
    const createFakeVideoStream = (audioStream) => {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream(30);

        if (audioStream) {
            audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }

        const draw = () => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            requestAnimationFrame(draw);
        };
        draw();
        return stream;
    };

    useEffect(() => {
        if (isRecording && inputMode === 'video' && liveVideoRef.current && streamRef.current) {
            liveVideoRef.current.srcObject = streamRef.current;
            liveVideoRef.current.muted = true; 
            liveVideoRef.current.play().catch(e => console.log("Preview play error:", e));
        }
    }, [isRecording, inputMode]);

    const handleRecordStart = (e) => {
        const now = Date.now();
        if (e.type === 'mousedown' && now - lastTouchTimeRef.current < 500) return;
        if (e.type === 'touchstart') lastTouchTimeRef.current = now;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        startXRef.current = clientX;
        startYRef.current = clientY;
        isSwipingToCancelRef.current = false;

        longPressTimeoutRef.current = setTimeout(() => {
            startRecordingProcess();
        }, 250); 
    };

    const handleRecordMove = (e) => {
        if (!isRecording || isLocked) return;

        if (e.type === 'mousemove') return;

        const clientX = e.touches ? e.touches[0].clientX : 0;
        const clientY = e.touches ? e.touches[0].clientY : 0;

        const diffY = startYRef.current - clientY;
        const diffX = startXRef.current - clientX;

        if (diffY > 80 && !isSwipingToCancelRef.current) {
            setIsLocked(true);
        }

        if (diffX > 100 && !isLocked) {
             isSwipingToCancelRef.current = true;
             cancelRecording(); 
        }
    };

    const handleRecordEnd = (e) => {
        const now = Date.now();
        if (e.type === 'mouseup' && now - lastTouchTimeRef.current < 500) return;

        if (longPressTimeoutRef.current) {
             clearTimeout(longPressTimeoutRef.current);
             longPressTimeoutRef.current = null;
             
             if (!isRecording) {
                 setInputMode(prev => prev === 'audio' ? 'video' : 'audio');
             }
        } else {
             if (isRecording && !isLocked) {
                 stopRecordingProcess(); 
             }
        }
    };

    const startRecordingProcess = async () => {
        try {
            const constraints = inputMode === 'video' 
                ? { audio: true, video: { facingMode: "user", aspectRatio: 1, width: 480, height: 480 } }
                : { audio: true };
            
            let stream;
            
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (cameraError) {
                if (inputMode === 'video') {
                    console.warn("Camera failed, using fallback black screen with audio.");
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream = createFakeVideoStream(audioStream);
                } else {
                    throw cameraError;
                }
            }

            streamRef.current = stream;

            const mimeType = inputMode === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                if (!streamRef.current && !recordedMedia) return;

                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                const finalDuration = recordingTimeRef.current;

                setRecordedMedia({
                    blob,
                    url,
                    type: inputMode,
                    duration: finalDuration 
                });
                
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
            };

            recorder.start();
            setIsRecording(true);
            setIsLocked(false);
            
            setRecordingTime(0);
            recordingTimeRef.current = 0;
            
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = setInterval(() => {
                recordingTimeRef.current += 1;
                setRecordingTime(recordingTimeRef.current);
            }, 1000);

        } catch (err) {
            console.error("Recording error:", err);
            alert("Ошибка доступа к микрофону/камере. Проверьте разрешения.");
        }
    };

    const stopRecordingProcess = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsLocked(false);
        clearInterval(timerIntervalRef.current);
    };

    const cancelRecording = () => {
        setIsRecording(false);
        setIsLocked(false);
        clearInterval(timerIntervalRef.current);
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        
        setRecordedMedia(null);
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const sendRecordedContent = async () => {
        if (!recordedMedia) return;

        const formData = new FormData();
        const ext = recordedMedia.type === 'video' ? 'webm' : 'webm';
        const fileName = `msg_${Date.now()}.${ext}`;
        formData.append('file', recordedMedia.blob, fileName);

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timestamp = Date.now();
        const tempId = timestamp;
        
        let optimisticContent = recordedMedia.url; 
        
        setRecordedMedia(null);
        setIsLocked(false);

        try {
            const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            
            if (data.url) {
                let finalMessage = data.url;
                if (recordedMedia.type === 'video') {
                    finalMessage = JSON.stringify({
                        url: data.url,
                        shape: videoShape
                    });
                }

                const optimisticMsg = { 
                    room, 
                    author: username, 
                    message: recordedMedia.type === 'video' ? finalMessage : data.url, 
                    type: recordedMedia.type, 
                    time, 
                    timestamp, 
                    status: 'pending', 
                    tempId, 
                    id: tempId 
                };
                
                const localDisplayMsg = {
                    ...optimisticMsg,
                    message: recordedMedia.type === 'video' 
                        ? JSON.stringify({ url: recordedMedia.url, shape: videoShape }) 
                        : recordedMedia.url
                };

                setMessageList(prev => [...prev, localDisplayMsg]);
                
                socket.emit("send_message", optimisticMsg, (res) => { 
                    if (res && res.status === 'ok') {
                        setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent', message: finalMessage } : m)); 
                    }
                });
            }
        } catch (err) {
            console.error("Upload failed", err);
        }
    };


    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (attachedFiles.length + files.length > 10) return;
        setAttachedFiles(prev => [...prev, ...files]);
        e.target.value = "";
    };
    const removeAttachment = (index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

    const sendMessage = async () => {
        if (!currentMessage.trim() && attachedFiles.length === 0) return;
        previousScrollHeight.current = 0;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timestamp = Date.now();
        const replyData = replyingTo ? { id: replyingTo.id, author: replyingTo.author, message: replyingTo.message } : null;

        if (attachedFiles.length > 0) {
            const formData = new FormData();
            attachedFiles.forEach(file => formData.append('files', file));
            try {
                const response = await fetch(`${BACKEND_URL}/upload-multiple`, { method: 'POST', body: formData });
                const data = await response.json();
                if (data.urls && data.urls.length > 0) {
                    let msgType = data.urls.length === 1 ? 'image' : 'gallery';
                    let msgContent = data.urls.length === 1 ? data.urls[0] : JSON.stringify(data.urls);
                    const tempId = timestamp + Math.random();
                    const optimisticMsg = { room, author: username, message: msgContent, type: msgType, time, timestamp, status: 'pending', tempId, id: tempId, replyTo: replyData };
                    
                    setChatPreviews(prev => ({ ...prev, [room]: { text: '📷 Изображение', sender: username, time, timestamp, type: 'image' } }));
                    setMessageList(prev => [...prev, optimisticMsg]);
                    socket.emit("send_message", optimisticMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m)); });
                }
            } catch (err) {}
            setAttachedFiles([]);
        }

        if (currentMessage.trim()) {
            const tempId = timestamp;
            const optimisticMsg = { room, author: username, message: currentMessage, type: 'text', time, timestamp, status: 'pending', tempId, id: tempId, replyTo: replyData };

            setChatPreviews(prev => ({ ...prev, [room]: { text: currentMessage, sender: username, time, timestamp, type: 'text' } }));
            setMessageList(prev => [...prev, optimisticMsg]);
            setCurrentMessage("");
            socket.emit("send_message", optimisticMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m)); });
        }
        setReplyingTo(null);
    };

    const handleBugSubmit = async () => {
        if (!bugDescription) return alert("Опишите проблему");
        const formData = new FormData();
        formData.append("reporter", username);
        formData.append("description", bugDescription);
        bugFiles.forEach(f => formData.append("files", f));

        try {
            await fetch(`${BACKEND_URL}/report-bug`, { method: "POST", body: formData });
            alert("Баг отправлен! Спасибо.");
            setActiveModal(null);
            setBugDescription("");
            setBugFiles([]);
        } catch (e) {
            alert("Ошибка отправки");
        }
    };

    const fetchBugReports = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/bug-reports`);
            const data = await res.json();
            setAdminBugList(data);
        } catch (e) { console.error(e); }
    };
    
    const resolveBug = async (id) => {
        await fetch(`${BACKEND_URL}/resolve-bug`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id})
        });
        fetchBugReports(); 
    }

    const openGroupInfo = () => {
        if (!myChats.includes(room) && room !== "General") { 
            socket.emit("get_user_profile", room.replace(username, "").replace("_", "") || room); 
            setShowMenu(false); 
        }
        else { 
            socket.emit("get_group_info", room); 
            setActiveModal("groupInfo"); 
            setShowMenu(false); 
        }
    };
    
    const openSettings = () => {
        socket.emit("get_my_profile", username); 
        socket.emit("get_avatar_history", username); 
        setProfileForm({ 
            bio: myProfile.bio || "", 
            phone: myProfile.phone || "",
            display_name: myProfile.display_name || username,
            username: username,
            notifications_enabled: myProfile.notifications_enabled
        });
        setActiveModal("settings");
    };

    const saveProfile = () => { 
        if (profileForm.username !== username) {
             const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
             if (!usernameRegex.test(profileForm.username)) {
                 alert("Nametag должен содержать только латинские буквы и цифры, минимум 3 символа.");
                 return;
             }
        }

        socket.emit("update_profile", { 
            username, 
            bio: profileForm.bio, 
            phone: profileForm.phone,
            display_name: profileForm.display_name,
            notifications_enabled: profileForm.notifications_enabled,
            newUsername: profileForm.username 
        }); 
        setActiveModal(null); 
    };

    const onMentionClick = (mentionedUser) => {
        socket.emit("get_user_profile", mentionedUser);
    };

    const copyProfileLink = (targetUsername) => {
        const link = `${window.location.origin}?user=${targetUsername}`;
        navigator.clipboard.writeText(link);
        alert("Ссылка на профиль скопирована!");
    };

    const leaveGroup = () => { if (window.confirm(myRole === 'owner' && room !== "General" ? "Удалить группу?" : "Выйти из группы?")) socket.emit("leave_group", { room }); };
    const removeFriend = (t) => { if (window.confirm(`Удалить ${t}?`)) { socket.emit("remove_friend", t); setActiveModal(null); }};
    const blockUser = (t) => { if (window.confirm(`Заблокировать ${t}?`)) { socket.emit("block_user", t); setActiveModal(null); }};
    const isPrivateChat = room.includes("_");
    const currentChatInfo = unifiedChatList.find(c => c.id === room);
    const displayRoomName = currentChatInfo?.name || (isPrivateChat ? room.replace(username, "").replace("_", "") : room);
    
    
    const roomAvatar = roomSettings.avatar_url || (room === "General" ? '' : '');
    const getAvatarStyle = (imgUrl) => imgUrl ? { backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#333', color: 'transparent', } : { backgroundColor: '#333' };

    let headerSubtitle = "";
    if (room === "General") {
        headerSubtitle = `${totalNetworkUsers} пользователей в сети`;
    } else if (typingText) {
        headerSubtitle = typingText;
    } else if (!isPrivateChat) {
        headerSubtitle = `${groupMembers.length} участников`;
    }

    const canDeleteMessage = (msg) => {
        const isAuthor = msg.author === username;
        const canManage = (myRole === 'owner' || myRole === 'editor' || globalRole === 'mod');
        return isAuthor || (canManage && !msg.room.includes('_'));
    }

    const onDragStart = (e, index) => {
        if (isSelectionMode) { e.preventDefault(); return; }
        dragItemRef.current = index;
    };

    const onDragEnter = (e, index) => {
        if (isSelectionMode) return;
        dragOverItemRef.current = index;
    };

    const onDragEnd = () => {
        if (isSelectionMode) return;
        
        if (dragItemRef.current === null || dragOverItemRef.current === null) {
            dragItemRef.current = null;
            dragOverItemRef.current = null;
            return;
        }

        const _unified = [...unifiedChatList];
        if (!_unified[dragItemRef.current] || !_unified[dragOverItemRef.current]) return;

        const draggedId = _unified[dragItemRef.current].originalId;
        const droppedId = _unified[dragOverItemRef.current].originalId;

        const newOrder = [...customChatOrder];
        unifiedChatList.forEach(c => { if (!newOrder.includes(c.originalId)) newOrder.push(c.originalId); });

        const fromIndex = newOrder.indexOf(draggedId);
        const toIndex = newOrder.indexOf(droppedId);

        if (fromIndex !== -1 && toIndex !== -1) {
            newOrder.splice(fromIndex, 1);
            newOrder.splice(toIndex, 0, draggedId);
            setCustomChatOrder(newOrder);
        }

        dragItemRef.current = null;
        dragOverItemRef.current = null;
    };

    const handleTouchDragStart = (e, chat) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        
        chatLongPressTimer.current = setTimeout(() => {
             if (window.navigator.vibrate) window.navigator.vibrate(50);
             setIsMobileDragging(true);
             setDraggedItemId(chat.id);
             if (customChatOrder.length === 0) {
                 setCustomChatOrder(unifiedChatList.map(c => c.originalId));
             }
        }, 200);
    };

    const handleTouchDragMove = (e) => {
        if (!isMobileDragging) {
             if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
             return;
        }
        if (e.cancelable) e.preventDefault(); 
        
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (element) {
            const chatItem = element.closest('.chat-list-item');
            if (chatItem) {
                const targetId = chatItem.getAttribute('data-chat-id');
                const draggedChat = unifiedChatList.find(c => c.id === draggedItemId);
                const targetChat = unifiedChatList.find(c => c.id === targetId);

                if (draggedChat && targetChat && targetId !== draggedItemId) {
                    const newOrder = [...(customChatOrder.length ? customChatOrder : unifiedChatList.map(c => c.originalId))];
                    const fromIndex = newOrder.indexOf(draggedChat.originalId);
                    const toIndex = newOrder.indexOf(targetChat.originalId);
                    if (fromIndex !== -1 && toIndex !== -1) {
                        newOrder.splice(fromIndex, 1);
                        newOrder.splice(toIndex, 0, draggedChat.originalId);
                        setCustomChatOrder(newOrder);
                    }
                }
            }
        }
    };

    const handleTouchDragEnd = () => {
        if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
        setIsMobileDragging(false);
        setDraggedItemId(null);
    };


    const handleChatLongPress = (chatId) => {
        if (isSelectionMode) return;
        setIsSelectionMode(true);
        setSelectedChats([chatId]);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    };

    const toggleChatSelection = (chatId) => {
        if (selectedChats.includes(chatId)) {
            const newSelection = selectedChats.filter(id => id !== chatId);
            setSelectedChats(newSelection);
            if (newSelection.length === 0) setIsSelectionMode(false);
        } else {
            setSelectedChats([...selectedChats, chatId]);
        }
    };

    const handleChatClick = (chatId) => {
        if (isSelectionMode) {
            toggleChatSelection(chatId);
        } else {
            switchChat(chatId);
        }
    };

    const handlePinSelected = () => {
        const newPinned = [...pinnedChats];
        const chatsToToggle = unifiedChatList.filter(c => selectedChats.includes(c.id));
        chatsToToggle.forEach(chat => {
            const idToStore = chat.originalId;
            if (newPinned.includes(idToStore)) {
                const idx = newPinned.indexOf(idToStore);
                newPinned.splice(idx, 1);
            } else {
                newPinned.unshift(idToStore);
            }
        });
        setPinnedChats(newPinned);
        setIsSelectionMode(false);
        setSelectedChats([]);
    };

    const handleDeleteSelected = () => {
        if (!window.confirm(`Удалить выбранные чаты (${selectedChats.length})?`)) return;
        
        const chatsToDelete = unifiedChatList.filter(c => selectedChats.includes(c.id));
        chatsToDelete.forEach(chat => {
            if (chat.type === 'group') {
                 if (chat.originalId !== 'General') socket.emit("leave_group", { room: chat.originalId });
            } else { 
                 socket.emit("remove_friend", chat.originalId);
            }
        });
        setIsSelectionMode(false);
        setSelectedChats([]);
    };

    const handleAddToFolder = (folderId) => {
        const updatedFolders = folders.map(f => {
            if (f.id === folderId) {
                const newChats = [...f.chatIds];
                const chatsToAdd = unifiedChatList.filter(c => selectedChats.includes(c.id));
                chatsToAdd.forEach(chat => {
                    if (!newChats.includes(chat.originalId)) newChats.push(chat.originalId);
                });
                return { ...f, chatIds: newChats };
            }
            return f;
        });
        setFolders(updatedFolders);
        setIsSelectionMode(false);
        setSelectedChats([]);
        setActiveModal(null);
    };

    const createNewFolder = () => {
        if (!newFolderName.trim()) return;
        const newFolder = {
            id: Date.now().toString(),
            name: newFolderName,
            chatIds: []
        };
        setFolders([...folders, newFolder]);
        setNewFolderName("");
        setActiveModal(null);
    };
    
    const removeFolder = (folderId) => {
        if(folderId === 'all') return;
        if(window.confirm("Удалить папку? Чаты не будут удалены.")) {
            setFolders(folders.filter(f => f.id !== folderId));
            if (activeFolderId === folderId) setActiveFolderId('all');
            setActiveModal(null);
        }
    }

    return (
      <div className={`main-layout ${isMobile ? "mobile-mode" : ""} ${isSelectionMode ? "selection-mode-active" : ""}`} style={{ touchAction: "pan-y" }}>
        
        <div 
            className={`tg-in-app-notification ${inAppNotif.visible ? 'visible' : ''}`}
            onClick={handleInAppNotifClick}
        >
            <div className="tg-notif-avatar" style={inAppNotif.avatar ? {backgroundImage: `url(${inAppNotif.avatar})`} : {}}>
                {!inAppNotif.avatar && inAppNotif.title[0]?.toUpperCase()}
            </div>
            <div className="tg-notif-content">
                <div className="tg-notif-title">{inAppNotif.title}</div>
                <div className="tg-notif-body">{inAppNotif.body}</div>
            </div>
        </div>

        {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            msg={contextMenu.msg} 
            onClose={() => setContextMenu(null)} 
            onReply={() => handleReply(contextMenu.msg)} 
            onCopy={() => handleCopy(contextMenu.msg.message)} 
            onDelete={() => { 
                handleDeleteMessage(contextMenu.msg.id); 
                setContextMenu(null); 
            }} 
            canDelete={canDeleteMessage(contextMenu.msg)}
          />
        )}

        {imageModalSrc && (
          <div className="image-modal-overlay" onClick={() => setImageModalSrc(null)}>
            <div className="image-modal-content"> <img src={imageModalSrc} alt="Full view" /> <button className="close-img-btn" onClick={() => setImageModalSrc(null)}>&times;</button> </div>
          </div>
        )}

        <input type="file" ref={avatarInputRef} className="hidden-input" onChange={onFileChange} accept="image/*" />

        {activeModal === "adminPanel" && (
            <AdminPanel 
                token={localStorage.getItem("apollo_token")} 
                socket={socket} 
                onClose={() => setActiveModal(null)} 
            />
        )}

        <div 
            className={`left-panel ${isMobile && showMobileChat ? "hidden" : ""}`}
            onTouchMove={handleTouchDragMove}
            onTouchEnd={handleTouchDragEnd}
        >
          
            <div className="sidebar-top">
                <div className="sidebar-header-content">
                  <div className="my-avatar" style={getAvatarStyle(myProfile.avatar_url)} onClick={openSettings}>{!myProfile.avatar_url && username[0].toUpperCase()}</div>
                  {isMobile && <div className="mobile-app-title">Chats</div>}
                </div>
                <div className="actMenu" style={{display: 'flex', gap: 15, alignItems: 'center'}}>
                     <div onClick={() => setActiveModal("notifications")} title="notifications"><IconBell hasUnread={hasUnreadNotifs} /></div>
                     
                     {globalRole === 'mod' && (
                        <button className="fab-btn" style={{backgroundColor: '#444', width: 40, height: 40}} onClick={() => setActiveModal("adminPanel")}>
                            <IconShield />
                        </button>
                     )}

                     <button className="fab-btn" onClick={() => setActiveModal("actionMenu")}><svg id="plus-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><path fill="#ffffff" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/></svg></button>
                </div>
              </div>

          {isSelectionMode ? (
              <div className="sidebar-selection-header">
                  <button className="back-btn" onClick={() => { setIsSelectionMode(false); setSelectedChats([]); }}>
                      &times;
                  </button>
                  <span className="selection-title">Выбрано: {selectedChats.length}</span>
                  <div className="selection-actions">
                       <button className="tool-btn" onClick={handlePinSelected} title="Закрепить/Открепить"><IconPin /></button>
                       <button className="tool-btn" onClick={() => setActiveModal("addToFolder")} title="В папку"><IconFolder /></button>
                       <button className="tool-btn" style={{color: '#ff4d4d'}} onClick={handleDeleteSelected} title="Удалить"><IconTrash /></button>
                  </div>
              </div>
          ) : (
            <p></p>
          )}

            <div className="friends-list">
                {!isSelectionMode && (
                    <div className="folder-tabs">
                        {folders.map(f => (
                            <div 
                                key={f.id} 
                                className={`folder-tab ${activeFolderId === f.id ? 'active' : ''}`}
                                onClick={() => setActiveFolderId(f.id)}
                                onContextMenu={(e) => { e.preventDefault(); setFolderToEdit(f); setActiveModal("editFolder"); }}
                            >
                                {f.name}
                            </div>
                        ))}
                        <div className="add-folder-btn" onClick={() => setActiveModal("createFolder")}>+</div>
                        <div className="background-folder-btn" onClick={() => setActiveModal("createFolder")}>+</div>
                    </div>
                )}
                
                <div className="chat-list-scroll-container">
                    {unifiedChatList.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>Нет чатов в этой папке</div>
                    )}

                    {unifiedChatList.map((chat, idx) => {
                        const isActive = chat.id === room;
                        const isSelected = selectedChats.includes(chat.id);
                        const isPinned = pinnedChats.includes(chat.originalId);
                        const isBeingDragged = isMobileDragging && draggedItemId === chat.id;

                        const renderPreview = () => {
                            if (!chat.preview) {
                                return chat.id === "General" ? "Новости и обновления" : "Нет сообщений";
                            }
                            const sender = chat.preview.sender === username ? "Вы: " : (chat.type === 'dm' ? "" : `${chat.preview.sender}: `);
                            let text = chat.preview.text;
                            if (chat.preview.type === 'image' || chat.preview.type === 'gallery') text = "📷 Изображение";
                            if (chat.preview.type === 'audio') text = "🎤 Голосовое сообщение";
                            if (chat.preview.type === 'video') text = "📹 Видео сообщение";
                            return <><span className="preview-sender">{sender}</span><span className="preview-text">{text}</span></>;
                        };

                        return (
                            <div 
                                key={chat.id} 
                                data-chat-id={chat.id}
                                className={`chat-list-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isPinned ? 'pinned' : ''} ${isBeingDragged ? 'dragging' : ''}`}
                                onClick={() => handleChatClick(chat.id)}
                                onContextMenu={(e) => { e.preventDefault(); handleChatLongPress(chat.id); }}
                                
                                onTouchStart={(e) => {
                                    if (!e.target.closest('.drag-handle')) {
                                        chatLongPressTimer.current = setTimeout(() => {
                                            handleChatLongPress(chat.id);
                                        }, 600);
                                    }
                                }}
                                onTouchEnd={() => {
                                    if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
                                }}
                                onTouchMove={() => {
                                    if (chatLongPressTimer.current) clearTimeout(chatLongPressTimer.current);
                                }}

                                draggable={!isSelectionMode}
                                onDragStart={(e) => onDragStart(e, idx)}
                                onDragEnter={(e) => onDragEnter(e, idx)}
                                onDragEnd={onDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                {isSelected && (
                                    <div className="check-icon-container">
                                        <IconCheckCircle />
                                    </div>
                                )}
                                
                                <div className="friend-avatar" style={getAvatarStyle(chat.avatar)}>
                                    {chat.id === "General" ? <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path fill="#ffffff" d="M2 5h2v2H2V5zm4 4H4V7h2v2zm2 0H6v2H4v2H2v6h20v-6h-2v-2h-2V9h2V7h2V5h-2v2h-2v2h-2V7H8v2zm0 0h8v2h2v2h2v4H4v-4h2v-2h2V9zm2 4H8v2h2v-2zm4 0h2v2h-2v-2z"/></svg> : (!chat.avatar && (chat.name[0] ? chat.name[0].toUpperCase() : "?"))}
                                </div>
                                <div className="chat-info-mobile">
                                    <div className="chat-name chat-name-row">
                                        <span className="chat-name-text">{chat.name}</span>
                                        {isPinned && <IconPin />}
                                        <span className="preview-time">{chat.preview?.time}</span>
                                    </div>
                                    <div className="chat-preview">
                                        {renderPreview()}
                                    </div>
                                </div>

                                <div 
                                    className="drag-handle"
                                    onTouchStart={(e) => handleTouchDragStart(e, chat)}
                                >
                                    <IconDrag />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        <div 
            className={`right-panel ${isMobile && !showMobileChat ? "hidden" : ""}`}
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            style={{
                transform: isMobile 
                    ? (showMobileChat ? `translateX(${swipeX}px)` : `translateX(100%)`) 
                    : 'none',
                transition: isSwiping.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                position: isMobile ? 'fixed' : 'relative',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 100
            }}
        >
            <div className="glass-chat-background"></div>            
          <div className="glass-chat">
            <div className="chat-header">
              <div className="header-left">
                {isMobile && (<button className="back-btn" onClick={handleCloseMobileChat}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="26" viewBox="0 0 24 24"><path fill="#ffffff" d="M16 5v2h-2V5h2zm-4 4V7h2v2h-2zm-2 2V9h2v2h-2zm0 2H8v-2h2v2zm2 2v-2h-2v2h2zm0 0h2v2h-2v-2zm4 4v-2h-2v2h2z"/></svg></button>)}
                <div onClick={openGroupInfo} style={{ cursor: "pointer", display: "flex", flexDirection: "column", whiteSpace: "nowrap"}}>
                  <h3 style={{ margin: 0 }}>{displayRoomName}</h3>
                  <span style={{ fontSize: 12, color: "#777", paddingLeft: 0 }}>
                      {headerSubtitle}
                  </span>
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm16 5H4v2h16v-2z"/></svg></button>
                {showMenu && (<div className="dropdown-menu"> <div className="menu-item" onClick={openGroupInfo}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M6 3h14v2h2v6h-2v8h-2V5H6V3zm8 14v-2H6V5H4v10H2v4h2v2h14v-2h-2v-2h-2zm0 0v2H4v-2h10zM8 7h8v2H8V7zm8 4H8v2h8v-2z"/></svg> Информация</div> {!isPrivateChat && (<div className="menu-item" onClick={() => setActiveModal("groupInfo")}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg> Добавить в группу</div>)} </div>)}
              </div>
            </div>

            {activeVideoState && (
                <GlobalVideoPlayer 
                    activeVideo={activeVideoState}
                    onTogglePlay={() => window.dispatchEvent(new CustomEvent('video-toggle-play'))}
                    onClose={() => {
                        setActiveVideoState(null);
                        window.dispatchEvent(new CustomEvent('video-close-focus'));
                    }}
                    onSeek={(val) => window.dispatchEvent(new CustomEvent('video-seek', { detail: val }))}
                    onSpeedChange={() => window.dispatchEvent(new CustomEvent('video-change-speed'))}
                />
            )}

            <div className="chat-body" ref={chatBodyRef} onScroll={handleScroll}>
              {isLoadingHistory && (<div style={{ textAlign: "center", fontSize: 12, color: "#666", padding: 10 }}>Загрузка истории...</div>)}
              {messageList.map((msg, index) => (<MessageItem key={msg.id || index} msg={msg} username={username} display_name={msg.author_display_name} setImageModalSrc={setImageModalSrc} onContextMenu={handleContextMenu} onReplyTrigger={handleReply} scrollToMessage={handleScrollToReply} onMentionClick={onMentionClick} />))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-background"></div>

            {(room === "General" || isPrivateChat || myRole !== 'guest' || globalRole === 'mod') ? (
                <div className="chat-input-wrapper">
                    
                    {recordedMedia ? (
                        <div className="media-preview-bar" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10}}>
                            <button className="tool-btn" onClick={cancelRecording} style={{color: '#ff4d4d', background: 'transparent'}}>
                                <IconTrash />
                            </button>
                            
                            <div style={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
                                {recordedMedia.type === 'audio' ? (
                                     <div style={{width: '100%', maxWidth: '300px'}}>
                                        <CustomAudioPlayer src={recordedMedia.url} /> 
                                     </div>
                                ) : (
                                    <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
                                        <CustomVideoPlayer 
                                            src={recordedMedia.url} 
                                            shape={videoShape} 
                                            width="240px"
                                            align="right"
                                            author={username}
                                            time="Сейчас"
                                        />
                                        <div className="shape-selector" style={{display: 'flex', flexDirection:'column', gap: 8, background: '#222', padding: 8, borderRadius: 20}}>
                                            {['circle', 'heart', 'triangle', 'square'].map(s => (
                                                <div 
                                                    key={s}
                                                    onClick={() => setVideoShape(s)}
                                                    style={{
                                                        width: 24, height: 24, background: '#555', cursor: 'pointer',
                                                        border: videoShape === s ? '2px solid #2b95ff' : '2px solid transparent',
                                                        borderRadius: s === 'circle' ? '50%' : (s === 'square' ? '4px' : '0'),
                                                        clipPath: s === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
                                                        transition: '0.2s'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button className="send-pill-btn" onClick={sendRecordedContent} style={{borderRadius: '50%', width: 45, height: 45, padding: 0, justifyContent: 'center'}}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </div>
                    ) : (
                        <>
                            {inputMode === 'video' && isRecording && (
                                <div className="live-camera-preview" style={{
                                    position: 'absolute', bottom: 85, right: 20, 
                                    width: 140, height: 140, borderRadius: '50%', 
                                    overflow: 'hidden', border: '4px solid #ff4d4d', zIndex: 999,
                                    background: '#000', boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                                }}>
                                    <video ref={liveVideoRef} muted autoPlay playsInline style={{width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)'}} />
                                </div>
                            )}

                            {isRecording && !isLocked && (
                                <div className="lock-indicator" style={{
                                    position: 'absolute', right: 30, bottom: 100, 
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                    color: '#aaa', animation: 'slideUpFade 1.5s infinite', zIndex: 90
                                }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c-4.42 0-8 3.58-8 8v4h16v-4c0-4.42-3.58-8-8-8zm4 12H8v-4c0-2.21 1.79-4 4-4s4 1.79 4 4v4z"/></svg>
                                    <span style={{fontSize: 10, marginTop: 2}}>Lock</span>
                                </div>
                            )}

                            {replyingTo && (<div className="reply-bar"><div><div style={{ color: "#8774e1", fontSize: 13, fontWeight: "bold" }}>В ответ {replyingTo.author}</div><div style={{ fontSize: 14, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" }}>{replyingTo.message}</div></div><button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 24 }}>&times;</button></div>)}
                            {attachedFiles.length > 0 && (<div className="attachments-preview"> {attachedFiles.map((f, i) => (<div key={i} className="attachment-thumb"> <img src={URL.createObjectURL(f)} alt="preview" /> <button onClick={() => removeAttachment(i)}>&times;</button> </div>))} </div>)}
                            
                            {!isRecording ? (
                                <textarea ref={textareaRef} value={currentMessage} placeholder="Написать сообщение..." className="chat-textarea" onChange={(e) => { setCurrentMessage(e.target.value); socket.emit("typing", { room, username }); }} onKeyDown={handleKeyDown} rows={1} />
                            ) : (
                                <div className="recording-status" style={{flex: 1, display: 'flex', alignItems: 'center', color: '#ff4d4d', fontWeight: 'bold', fontSize: 16, paddingLeft: 10}}>
                                    <span style={{marginRight: 10, animation: 'pulse 1s infinite'}}>●</span>
                                    {formatTime(recordingTime)}
                                    
                                    {isMobile && (
                                        <span style={{marginLeft: 20, color: '#666', fontSize: 13, fontWeight: 'normal'}}>
                                            {isLocked ? "Запись закреплена" : "< Свайп для отмены"}
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="input-toolbar">
                                <div className="toolbar-left" style={{opacity: isRecording ? 0 : 1, pointerEvents: isRecording ? 'none' : 'auto', transition: '0.2s'}}>
                                    <input type="file" className="hidden-input" multiple ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                                    <button className="tool-btn" onClick={() => fileInputRef.current.click()} title="Прикрепить фото"><IconPaperclip></IconPaperclip></button>
                                </div>
                                
                                <div className="toolbar-right">
                                    {(currentMessage.trim() || attachedFiles.length > 0) && !isRecording ? (
                                        <button className="send-pill-btn" onClick={sendMessage}> Отправить ↵ </button>
                                    ) : (
                                        <div 
                                            className={`record-btn-container ${isRecording ? 'recording-active' : ''}`}
                                            onMouseDown={handleRecordStart}
                                            onMouseMove={handleRecordMove}
                                            onMouseUp={handleRecordEnd}
                                            onMouseLeave={handleRecordEnd}
                                            onTouchStart={handleRecordStart}
                                            onTouchMove={handleRecordMove}
                                            onTouchEnd={handleRecordEnd}
                                            onTouchCancel={handleRecordEnd}
                                            
                                            style={{position: 'relative', touchAction: 'none', cursor: 'pointer', padding: 5}} 
                                        >
                                            {isLocked ? (
                                                <button className="send-pill-btn" onClick={stopRecordingProcess} style={{borderRadius: '50%', width: 50, height: 50, padding: 0, justifyContent: 'center'}}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                                                </button>
                                            ) : (
                                                <button className={`mic-btn ${isRecording ? "recording" : ""}`} style={{
                                                    transform: isRecording ? 'scale(1.8)' : 'scale(1)', 
                                                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                    pointerEvents: 'none' 
                                                }}>
                                                    {inputMode === 'audio' ? <IconMic /> : (
                                                        <IconCamera />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>
                    У вас нет прав писать в этот чат.
                </div>
            )}
          </div>
        </div>
      </div>
    );
}

export default Chat;