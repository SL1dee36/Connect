import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from "./Modal";
import Cropper from 'react-easy-crop';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// --- SVG Icons ---
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
         <path fill="currentColor" d="M10 9V5l-7 7l7 7v-4.1c5 0 8.5 1.6 11 5.1c-1-5-4-10-11-11z"/>
    </svg>
);
const IconCopy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
);
const IconTrash = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
         <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
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

// --- HELPER FUNCTION FOR TIMER ---
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// --- HELPER: Parse Mentions in Text ---
const renderMessageWithMentions = (text, onMentionClick) => {
    const mentionRegex = /(@\w+)/g;
    const parts = text.split(mentionRegex);
    return parts.map((part, index) => {
        if (part.match(mentionRegex)) {
            const username = part.substring(1); // remove @
            return (
                <span 
                    key={index} 
                    className="mention-link" 
                    onClick={(e) => { e.stopPropagation(); onMentionClick(username); }}
                >
                    {part}
                </span>
            );
        }
        return part;
    });
};

// --- Context Menu Component ---
// --- ИЗМЕНЕНИЕ: canDelete заменил isMine для большей ясности ---
const ContextMenu = ({ x, y, msg, onClose, onReply, onCopy, onDelete, canDelete }) => {
    return (
        <div style={{
            position: 'fixed', top: y, left: x, zIndex: 9999,
            background: '#252525', borderRadius: 8, border: '1px solid #333',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', overflow: 'hidden', minWidth: 150
        }} onClick={(e) => e.stopPropagation()}>
            <div className="menu-item" onClick={onReply} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'white'}}>
                <IconReply/> Ответить
            </div>
            <div className="menu-item" onClick={onCopy} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'white'}}>
                <IconCopy/> Копировать
            </div>
            {/* --- ИЗМЕНЕНИЕ: Проверяем canDelete --- */}
            {canDelete && (
                <div className="menu-item" onClick={onDelete} style={{padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#ff4d4d'}}>
                    <IconTrash/> Удалить
                </div>
            )}
        </div>
    );
};

// --- Message Item ---
const MessageItem = React.memo(({ msg, username, setImageModalSrc, onContextMenu, onReplyTrigger, scrollToMessage, onMentionClick }) => {
    const isMine = msg.author === username;
    const [translateX, setTranslateX] = useState(0);
    const [isLongPress, setIsLongPress] = useState(false);
    
    const touchStartRef = useRef(null);
    const touchCurrentRef = useRef(null);
    const longPressTimerRef = useRef(null);

    let content;
    if (msg.type === 'image') {
        content = <img src={msg.message} alt="attachment" className="chat-image" loading="lazy" onClick={() => setImageModalSrc(msg.message)} />;
    } else if (msg.type === 'gallery') {
        const images = JSON.parse(msg.message);
        content = (
            <div className="gallery-grid">
                {images.map((img, i) => <img key={i} src={img} alt="gallery" className="gallery-image" loading="lazy" onClick={() => setImageModalSrc(img)} />)}
            </div>
        );
    } else if (msg.type === 'audio') {
        content = <audio controls src={msg.message} className="audio-player" />;
    } else {
        // ОБРАБОТКА MARKDOWN И МЕНШЕНОВ
        // Превращаем @username в markdown-ссылку, чтобы ReactMarkdown мог её обработать
        const processedText = msg.message.replace(/@(\w+)/g, '[@$1]($1)');

        content = (
            <div className="markdown-content">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // Кастомный рендер для ссылок (наших меншенов)
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
                        // Убираем лишние отступы у параграфов в баблах
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
        touchCurrentRef.current = e.touches[0].clientX;
        longPressTimerRef.current = setTimeout(() => {
            setIsLongPress(true);
            const touch = e.touches[0];
            onContextMenu(e, msg, touch.clientX, touch.clientY);
            if (window.navigator.vibrate) window.navigator.vibrate(20);
        }, 500);
    };
    const handleTouchMove = (e) => {
        touchCurrentRef.current = e.touches[0].clientX;
        const diff = touchCurrentRef.current - touchStartRef.current;
        if (Math.abs(diff) > 10) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
        if (diff > 0 && diff < 150) setTranslateX(diff);
    };
    const handleTouchEnd = () => {
        clearTimeout(longPressTimerRef.current);
        if (isLongPress) { setIsLongPress(false); return; }
        if (translateX > 80) { if (window.navigator.vibrate) window.navigator.vibrate(10); onReplyTrigger(msg); }
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
                <div className="bubble">
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
                </div>
                <div className="message-footer">
                    <span className="meta">{msg.time} • {msg.author} {isMine && msg.status === 'sent' && <IconCheck />}</span>
                </div>
            </div>
        </div>
    );
});


function Chat({ socket, username, room, setRoom, handleLogout }) {
    const [myChats, setMyChats] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_my_chats")) || []; } catch { return []; } });
    const [friends, setFriends] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_friends")) || []; } catch { return []; } });
    const [myProfile, setMyProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("apollo_my_profile")) || { bio: "", phone: "", avatar_url: "", display_name: "", notifications_enabled: 1 }; } catch { return { bio: "", phone: "", avatar_url: "", display_name: "", notifications_enabled: 1 }; } });

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
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
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

    const messagesEndRef = useRef(null);
    const chatBodyRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const previousScrollHeight = useRef(0);
    const textareaRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    
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

    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
    }, []);

    const sendSystemNotification = useCallback((title, body) => {
        if (!("Notification" in window)) return;
        const currentProfile = myProfileRef.current;
        if (currentProfile.notifications_enabled === 0 || currentProfile.notifications_enabled === false) return; 
        if (Notification.permission === "granted") {
            try { new Notification(title, { body, icon: '/vite.svg' }); } catch (e) {}
        }
    }, []);

    const requestNotificationPermission = () => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    socket.emit("update_profile", { ...myProfile, notifications_enabled: true });
                }
            });
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
        let menuX = x; let menuY = y;
        if (x + 150 > window.innerWidth) menuX = window.innerWidth - 160;
        if (y + 120 > window.innerHeight) menuY = window.innerHeight - 130;
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

    const switchChat = useCallback((targetName) => {
        if (!targetName || typeof targetName !== 'string') return;
        const isGroupChat = targetName === "General" || myChats.includes(targetName);
        const roomId = isGroupChat ? targetName : [username, targetName].sort().join("_");
        if (roomId !== room) { setRoom(roomId); localStorage.setItem("apollo_room", roomId); }
        if (isMobile) { setShowMobileChat(true); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); }
    }, [room, setRoom, username, isMobile, myChats]);

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
            
            sendSystemNotification(title, body);
        };

        const handleMyProfile = (data) => {
             setMyProfile({
                 ...data,
                 notifications_enabled: data.notifications_enabled === 1
             });
        };
        
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

        socket.emit("get_initial_data"); 
        socket.emit("get_my_profile", username);

        return () => {
            window.removeEventListener('resize', handleResize);
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
        };
    }, [socket, username, switchChat, playNotificationSound, sendSystemNotification, handleLogout, room]);

    useEffect(() => {
        if (!room) return;
        
        setMessageList([]);
        setHasMore(true);
        setTypingText("");
        setAttachedFiles([]);
        setCurrentMessage("");
        setReplyingTo(null);
        setIsLoadingHistory(true);
        
        socket.emit("join_room", { username, room });
        
        if (!room.includes("_")) {
            socket.emit("get_group_info", room);
        }

        const handleReceiveMessage = (data) => {
             if (data.room === room) {
                setMessageList((list) => {
                    if (data.author === username && data.tempId) {
                         const exists = list.find(m => m.tempId === data.tempId);
                         if (exists) return list.map(m => m.tempId === data.tempId ? { ...data, status: 'sent' } : m);
                    }
                    return [...list, data];
                });
                if (data.author !== username && document.hidden) { playNotificationSound(); sendSystemNotification(data.author, data.message); }
             } else {
                if (data.author !== username) { playNotificationSound(); sendSystemNotification(data.author, data.message); }
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
        
        socket.on("group_info_data", (d) => { if(d.room === room) { setGroupMembers(d.members); setMyRole(d.myRole); } });
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
        if (!isLoadingHistory && messageList.length > 0) {
            const lastMsg = messageList[messageList.length - 1];
            if(lastMsg && (lastMsg.author === username || !isLoadingHistory)) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messageList, username, isLoadingHistory]);

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
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorderRef.current.onstop = sendVoiceMessage;
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) { alert("Mic Error"); }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(timerIntervalRef.current); mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); }
    };
    const sendVoiceMessage = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice_message.webm');
        try {
            const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.url) {
                const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const tempId = Date.now();
                const optimisticMsg = { room, author: username, message: data.url, type: 'audio', time, status: 'pending', tempId, id: tempId, replyTo: replyingTo ? { id: replyingTo.id, author: replyingTo.author, message: replyingTo.message } : null };
                setMessageList(prev => [...prev, optimisticMsg]);
                setReplyingTo(null);
                socket.emit("send_message", optimisticMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m)); });
            }
        } catch (err) {}
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
                    const tempId = Date.now() + Math.random();
                    const optimisticMsg = { room, author: username, message: msgContent, type: msgType, time, status: 'pending', tempId, id: tempId, replyTo: replyData };
                    setMessageList(prev => [...prev, optimisticMsg]);
                    socket.emit("send_message", optimisticMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m)); });
                }
            } catch (err) {}
            setAttachedFiles([]);
        }

        if (currentMessage.trim()) {
            const tempId = Date.now();
            const optimisticMsg = { room, author: username, message: currentMessage, type: 'text', time, status: 'pending', tempId, id: tempId, replyTo: replyData };
            setMessageList(prev => [...prev, optimisticMsg]);
            setCurrentMessage("");
            socket.emit("send_message", optimisticMsg, (res) => { if (res && res.status === 'ok') setMessageList(prev => prev.map(m => m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m)); });
        }
        setReplyingTo(null);
    };

    const openGroupInfo = () => {
        if (!myChats.includes(room)) { socket.emit("get_user_profile", room.replace(username, "").replace("_", "") || room); setShowMenu(false); }
        else { socket.emit("get_group_info", room); setActiveModal("groupInfo"); setShowMenu(false); }
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
    
    const displayRoomName = (room === "General") ? "Community Bot" : ((myChats.includes(room)) ? room : room.replace(username, "").replace("_", ""));
    const isPrivateChat = !myChats.includes(room);
    const getAvatarStyle = (imgUrl) => imgUrl ? { backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent', border: '2px solid #333' } : {};

    let headerSubtitle = "";
    if (room === "General") {
        headerSubtitle = `${totalNetworkUsers} пользователей в сети`;
    } else if (typingText) {
        headerSubtitle = typingText;
    } else if (!isPrivateChat) {
        headerSubtitle = `${groupMembers.length} участников`;
    }

    // --- ИЗМЕНЕНИЕ: Условие для возможности удаления ---
    const canDeleteMessage = (msg) => {
        const isAuthor = msg.author === username;
        // Можно удалить, если ты автор ИЛИ если ты админ группы (и это не личный чат)
        const isGroupOwner = myRole === 'owner' && !room.includes('_');
        return isAuthor || isGroupOwner;
    }

    return (
      <div className={`main-layout ${isMobile ? "mobile-mode" : ""}`} style={{ touchAction: "pan-y" }}>
        {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            msg={contextMenu.msg} 
            onClose={() => setContextMenu(null)} 
            onReply={() => handleReply(contextMenu.msg)} 
            onCopy={() => handleCopy(contextMenu.msg.message)} 
            onDelete={() => { handleDeleteMessage(contextMenu.msg.id); setContextMenu(null); }} 
            // --- ИЗМЕНЕНИЕ: Передаем новое условие в компонент ---
            canDelete={canDeleteMessage(contextMenu.msg)}
          />
        )}

        {imageModalSrc && (
          <div className="image-modal-overlay" onClick={() => setImageModalSrc(null)}>
            <div className="image-modal-content"> <img src={imageModalSrc} alt="Full view" /> <button className="close-img-btn" onClick={() => setImageModalSrc(null)}>&times;</button> </div>
          </div>
        )}

        <input type="file" ref={avatarInputRef} style={{ display: "none" }} onChange={onFileChange} accept="image/*" />

        <div className={`left-panel ${isMobile && showMobileChat ? "hidden" : ""}`}>
          <div className="sidebar-top">
            <div className="sidebar-header-content">
              <div className="my-avatar" style={getAvatarStyle(myProfile.avatar_url)} onClick={openSettings}>{!myProfile.avatar_url && username[0].toUpperCase()}</div>
              {isMobile && <div className="mobile-app-title">Chats</div>}
            </div>
            <div className="actMenu" style={{display: 'flex', gap: 15, alignItems: 'center'}}>
                 <div onClick={() => setActiveModal("notifications")} title="notifications"><IconBell hasUnread={hasUnreadNotifs} /></div>
                 <button className="fab-btn" onClick={() => setActiveModal("actionMenu")}><svg id="plus-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><path fill="#ffffff" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/></svg></button>
            </div>
          </div>

          <div className="friends-list">
            {myChats.filter((chat) => chat && typeof chat === "string").map((chat, idx) => (
                <div key={idx} className="chat-list-item" onClick={() => switchChat(chat)}>
                  <div className="friend-avatar" style={{ background: chat === room ? "#2b95ff" : "#333", color: "white" }}>
                      {chat === "General" ? <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path fill="#ffffff" d="M2 5h2v2H2V5zm4 4H4V7h2v2zm2 0H6v2H4v2H2v6h20v-6h-2v-2h-2V9h2V7h2V5h-2v2h-2v2h-2V7H8v2zm0 0h8v2h2v2h2v4H4v-4h2v-2h2V9zm2 4H8v2h2v-2zm4 0h2v2h-2v-2z"/></svg> : chat.substring(0, 2)}
                  </div>
                  <div className="chat-info-mobile">
                      <div className="chat-name">{chat === "General" ? "Community Bot" : chat}</div>
                      <div className="chat-preview">
                          {chat === "General" ? "Новости и обновления" : "Групповой чат"}
                      </div>
                  </div>
                </div>
            ))}
            {friends.map((friend, idx) => {
                const fName = friend.username || friend;
                const fAvatar = friend.avatar_url;
                const isActive = [username, fName].sort().join("_") === room;
                const avatarStyle = { 
                    background: isActive ? "#2b95ff" : "#444",
                    backgroundImage: fAvatar ? `url(${fAvatar})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                };

                return (
                  <div key={idx} className="chat-list-item" onClick={() => switchChat(fName)}>
                    <div className="friend-avatar" style={avatarStyle}>
                        {!fAvatar && (fName[0] ? fName[0].toUpperCase() : "?")}
                    </div>
                    <div className="chat-info-mobile">
                        <div className="chat-name">{fName}</div>
                        <div className="chat-preview">Личное сообщение</div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>

        <div className={`right-panel ${isMobile && !showMobileChat ? "hidden" : ""}`}>
          <div className="glass-chat">
            <div className="chat-header">
              <div className="header-left">
                {isMobile && (<button className="back-btn" onClick={() => setShowMobileChat(false)}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="26" viewBox="0 0 24 24"><path fill="#ffffff" d="M16 5v2h-2V5h2zm-4 4V7h2v2h-2zm-2 2V9h2v2h-2zm0 2H8v-2h2v2zm2 2v-2h-2v2h2zm0 0h2v2h-2v-2zm4 4v-2h-2v2h2z"/></svg></button>)}
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

            <div className="chat-body" ref={chatBodyRef} onScroll={handleScroll}>
              {isLoadingHistory && (<div style={{ textAlign: "center", fontSize: 12, color: "#666", padding: 10 }}>Загрузка истории...</div>)}
              {messageList.map((msg, index) => (<MessageItem key={msg.id || index} msg={msg} username={username} setImageModalSrc={setImageModalSrc} onContextMenu={handleContextMenu} onReplyTrigger={handleReply} scrollToMessage={handleScrollToReply} onMentionClick={onMentionClick} />))}
              <div ref={messagesEndRef} />
            </div>

            {/* --- ИЗМЕНЕНИЕ: Условие для отображения поля ввода --- */}
            {(room !== "General" || myRole === 'owner') ? (
                <div className="chat-input-wrapper">
                {replyingTo && (<div className="reply-bar"><div><div style={{ color: "#8774e1", fontSize: 13, fontWeight: "bold" }}>В ответ {replyingTo.author}</div><div style={{ fontSize: 14, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" }}>{replyingTo.message}</div></div><button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 24 }}>&times;</button></div>)}
                {attachedFiles.length > 0 && (<div className="attachments-preview"> {attachedFiles.map((f, i) => (<div key={i} className="attachment-thumb"> <img src={URL.createObjectURL(f)} alt="preview" /> <button onClick={() => removeAttachment(i)}>&times;</button> </div>))} </div>)}
                <textarea ref={textareaRef} value={currentMessage} placeholder="Написать сообщение..." className="chat-textarea" onChange={(e) => { setCurrentMessage(e.target.value); socket.emit("typing", { room, username }); }} onKeyDown={handleKeyDown} rows={1} />
                <div className="input-toolbar">
                    <div className="toolbar-left">
                    <input type="file" style={{ display: "none" }} multiple ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                    <button className="tool-btn" onClick={() => fileInputRef.current.click()} title="Прикрепить фото"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg></button>
                    </div>
                    <div className="toolbar-right">
                    {currentMessage.trim() || attachedFiles.length > 0 ? (<button className="send-pill-btn" onClick={sendMessage}> Отправить ↵ </button>) : (<button className={`mic-btn ${isRecording ? "recording" : ""}`} onClick={isRecording ? stopRecording : startRecording}>{isRecording ? formatTime(recordingTime) : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>)}</button>)}
                    </div>
                </div>
                </div>
            ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 13 }}>
                    Только администраторы могут писать в этот канал.
                </div>
            )}
          </div>
        </div>

        {/* MODALS */}
        {activeModal === "notifications" && (
            <Modal title="Уведомления" onClose={() => { setActiveModal(null); setHasUnreadNotifs(false); }}>
                 <div className="settings-list" style={{padding: 0}}>
                    {notifications.length === 0 && (<div style={{textAlign: 'center', padding: 20, color: '#888'}}>Нет уведомлений</div>)}
                    {notifications.map((notif) => (
                        <div key={notif.id} className="settings-item" style={{ backgroundColor: notif.is_read ? 'transparent' : 'rgba(43, 149, 255, 0.1)', borderBottom: '1px solid #333', flexDirection: 'column', alignItems: 'flex-start', gap: 5 }}>
                             <div style={{display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center'}}>
                                 <span style={{fontWeight: 'bold', fontSize: 14}}>{notif.type === 'friend_request' ? "Заявка в друзья" : (notif.type === 'mention' ? "Упоминание" : "Уведомление")}</span>
                                 <button onClick={() => { socket.emit("delete_notification", {id: notif.id}); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }} style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer'}}>&times;</button>
                             </div>
                             <div style={{fontSize: 14, color: '#ddd'}}>
                                 {notif.type === 'friend_request' ? `Пользователь ${notif.content} хочет добавить вас в друзья.` : notif.content}
                             </div>
                             {notif.type === 'mention' && (
                                <button className="btn-accept" style={{marginTop: 5, padding: '5px 10px', fontSize: 12}} onClick={() => switchChat(notif.data)}>Перейти к чату</button>
                             )}
                             {notif.type === 'friend_request' && (
                                 <div className="notification-actions" style={{marginTop: 5, display: 'flex', gap: 10}}>
                                      <button className="btn-accept" onClick={() => { socket.emit("accept_friend_request", { notifId: notif.id, fromUsername: notif.content }); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>Принять</button>
                                      <button className="btn-decline" onClick={() => { socket.emit("decline_friend_request", { notifId: notif.id }); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}>Отклонить</button>
                                 </div>
                             )}
                        </div>
                    ))}
                 </div>
            </Modal>
        )}

        {activeModal === "actionMenu" && (
          <Modal title="CONNECT" onClose={() => setActiveModal(null)}>
            <div className="action-grid">
              <div className="action-card" onClick={() => setActiveModal("createGroup")}> <span style={{ fontSize: 12}}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M11 0H5v2H3v6h2v2h6V8H5V2h6V0zm0 2h2v6h-2V2zM0 14h2v4h12v2H0v-6zm2 0h12v-2H2v2zm14 0h-2v6h2v-6zM15 0h4v2h-4V0zm4 8h-4v2h4V8zm0-6h2v6h-2V2zm5 12h-2v4h-4v2h6v-6zm-6-2h4v2h-4v-2z"/></svg></span> <div><div style={{ fontWeight: "bold" }}>Новая группа</div></div> </div>
              <div className="action-card" onClick={() => setActiveModal("searchGroup")}> <span style={{ fontSize: 24 }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M6 2h8v2H6V2zM4 6V4h2v2H4zm0 8H2V6h2v8zm2 2H4v-2h2v2zm8 0v2H6v-2h8zm2-2h-2v2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-2zm0-8h2v8h-2V6zm0 0V4h-2v2h2z"/></svg></span> <div><div style={{ fontWeight: "bold" }}>Найти группу</div></div> </div>
              <div className="action-card" onClick={() => setActiveModal("addFriend")}> <span style={{ fontSize: 24 }}><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path fill="#ffffff" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg></span> <div><div style={{ fontWeight: "bold" }}>Поиск людей</div></div> </div>
            </div>
          </Modal>
        )}

        {activeModal === "createGroup" && (<Modal title="Создать группу" onClose={() => setActiveModal(null)}> <input className="modal-input" placeholder="Название..." value={newChatName} onChange={(e) => setNewChatName(e.target.value)} /> <button className="btn-primary" onClick={() => { if (newChatName) socket.emit("create_group", { room: newChatName, username }); }}> Создать </button> </Modal>)}

        {activeModal === "searchGroup" && (
          <Modal title="Поиск групп" onClose={() => { setActiveModal(null); setSearchGroupResults([]); setSearchQuery(""); }}>
            <input className="modal-input" placeholder="Название..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {isSearching && (<div style={{ textAlign: "center", color: "#888", padding: 10 }}>Поиск...</div>)}
            <div className="search-results">
              {searchGroupResults.length === 0 && searchQuery && !isSearching && (<div style={{ textAlign: "center", color: "#666", padding: 10 }}>Ничего не найдено</div>)}
              {searchGroupResults.map((g, i) => (
                <div key={i} className="search-item"> <span>{g.room}</span> {!myChats.includes(g.room) && (<button className="add-btn-small" onClick={() => socket.emit("join_existing_group", { room: g.room, username })}>➜</button>)} </div>
              ))}
            </div>
          </Modal>
        )}

        {activeModal === "addFriend" && (
          <Modal title="Поиск людей" onClose={() => { setActiveModal(null); setSearchResults([]); setSearchQuery(""); }}>
            <input className="modal-input" placeholder="@nametag или имя..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {isSearching && (<div style={{ textAlign: "center", color: "#888", padding: 10 }}>Поиск...</div>)}
            <div className="search-results">
              {searchResults.length === 0 && searchQuery && !isSearching && (<div style={{ textAlign: "center", color: "#666", padding: 10 }}>Ничего не найдено</div>)}
              {searchResults.map((u, i) => (
                <div key={i} className="search-item">
                  <div className="member-info"> <div className="friend-avatar" style={{ fontSize: 12, backgroundImage: `url(${u.avatar_url})` }}>{!u.avatar_url && u.username[0]}</div> 
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={{lineHeight: 1}}>{u.display_name}</span>
                        <span style={{fontSize: 11, color: '#888'}}>@{u.username}</span>
                    </div>
                  </div>
                  {!friends.includes(u.username) && (<button className="add-btn-small" onClick={() => { socket.emit("send_friend_request_by_name", { toUsername: u.username }); alert("Заявка отправлена!"); }}>+</button>)}
                </div>
              ))}
            </div>
          </Modal>
        )}

        {activeModal === "settings" && (
          <Modal title="My Profile" onClose={() => setActiveModal(null)}>
            <div className="profile-hero"> 
                <div className="profile-avatar-large" style={getAvatarStyle(myProfile.avatar_url)}>{!myProfile.avatar_url && username[0].toUpperCase()}</div> 
                <div className="profile-name">{myProfile.display_name || username}</div> 
                <div className="profile-status"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#1a7bd6"><path fill="#1a7bd6" d="M4 4h16v12H8V8h8v6h2V6H6v12h14v2H4V4zm10 10v-4h-4v4h4z"/></svg>{username}</div> 
                <button className="change-avatar-btn" onClick={() => avatarInputRef.current.click()}>Set Profile Photo</button> 
            </div>
            
            <div className="settings-list">
              <div className="settings-item"> 
                <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}> 
                    <div className="input-group"> 
                        <label>Display Name</label> 
                        <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.display_name} onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })} placeholder="Your Name" /> 
                    </div> 
                </div> 
              </div>

              <div className="settings-item"> 
                <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="#ffffff"><path fill="#ffffff" d="M4 4h16v12H8V8h8v6h2V6H6v12h14v2H4V4zm10 10v-4h-4v4h4z"/></svg></div> 
                <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}> 
                    <div className="input-group"> 
                        <label>Nametag</label> 
                        <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} placeholder="@username" /> 
                    </div> 
                </div> 
              </div>

              <div className="settings-item"> <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="#ffffff" d="M1 2h8.58l1.487 6.69l-1.86 1.86a14.08 14.08 0 0 0 4.243 4.242l1.86-1.859L22 14.42V23h-1a19.91 19.91 0 0 1-10.85-3.196a20.101 20.101 0 0 1-5.954-5.954A19.91 19.91 0 0 1 1 3V2Zm2.027 2a17.893 17.893 0 0 0 2.849 8.764a18.102 18.102 0 0 0 5.36 5.36A17.892 17.892 0 0 0 20 20.973v-4.949l-4.053-.9l-2.174 2.175l-.663-.377a16.073 16.073 0 0 1-6.032-6.032l-.377-.663l2.175-2.174L7.976 4H3.027Z"/></svg></div> <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}> <div className="input-group"> <label>Mobile</label> <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Add phone number" /> </div> </div> </div>
              <div className="settings-item"> <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="#ffffff" d="M21 1v22H3V1h18Zm-8 2v6.5l-3-2.25L7 9.5V3H5v18h14V3h-6ZM9 3v2.5l1-.75l1 .75V3H9Zm-2 9h10v2H7v-2Zm0 4h8v2H7v-2Z"/></svg></div> <div className="form-container" style={{ flex: 1, padding: 0, margin: 0 }}> <div className="input-group"> <label>Bio</label> <input className="modal-input" style={{ padding: "5px 0", borderBottom: "none" }} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Add a few words about yourself" /> </div> </div> </div>
              
              <div className="settings-item" onClick={requestNotificationPermission}> 
                <div className="settings-icon"><IconBell hasUnread={false}/></div> 
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div className="settings-label">Notifications</div>
                     <div className={`toggle-switch ${profileForm.notifications_enabled ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); setProfileForm({...profileForm, notifications_enabled: !profileForm.notifications_enabled}); }}>
                         <div className="knob"></div>
                     </div>
                </div>
              </div>
              
               <div className="settings-item" onClick={() => copyProfileLink(username)}> 
                <div className="settings-icon"><IconShare/></div> 
                <div className="settings-label">Поделиться профилем</div>
              </div>

            </div>
            <div className="avatar-history" style={{ padding: "0 20px" }}>
              <h4>История аватаров</h4>
              <div className="avatar-history-container"> {avatarHistory.map((avatar) => ( <div key={avatar.id} className="avatar-history-item"> <img src={avatar.avatar_url} alt="old avatar" onClick={() => setImageModalSrc(avatar.avatar_url)} /> <button className="delete-avatar-btn" onClick={() => socket.emit("delete_avatar", { avatarId: avatar.id })}>🗑</button> </div> ))} </div>
            </div>
            <div style={{ padding: "0 20px 20px 20px" }}> <button className="btn-primary" style={{ width: "100%" }} onClick={saveProfile}>Save Changes</button> <button className="btn-danger" style={{ marginTop: 10, textAlign: "center" }} onClick={handleLogout}>Log Out</button> </div>
          </Modal>
        )}

        {avatarEditor.isOpen && (
          <Modal title="Редактор Аватара" onClose={() => setAvatarEditor({ ...avatarEditor, isOpen: false })}>
            <div className="avatar-editor-content">
              <div className="crop-container"> <Cropper image={avatarEditor.image} crop={avatarEditor.crop} zoom={avatarEditor.zoom} aspect={1} onCropChange={(crop) => setAvatarEditor((p) => ({ ...p, crop }))} onZoomChange={(zoom) => setAvatarEditor((p) => ({ ...p, zoom }))} onCropComplete={(_, croppedAreaPixels) => setAvatarEditor((p) => ({ ...p, croppedAreaPixels }))} imageStyle={{ filter: `brightness(${avatarEditor.filters.brightness}%) contrast(${avatarEditor.filters.contrast}%) saturate(${avatarEditor.filters.saturate}%) blur(${avatarEditor.filters.blur}px)` }} /> </div>
              <div className="editor-controls"> <div className="slider-group"> <label>Zoom</label> <input type="range" min={1} max={3} step={0.1} value={avatarEditor.zoom} onChange={(e) => setAvatarEditor((p) => ({ ...p, zoom: e.target.value }))} /> </div> <div className="slider-group"> <label>Яркость</label> <input type="range" min={0} max={200} value={avatarEditor.filters.brightness} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, brightness: e.target.value }, }))} /> </div> <div className="slider-group"> <label>Контраст</label> <input type="range" min={0} max={200} value={avatarEditor.filters.contrast} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, contrast: e.target.value }, }))} /> </div> <div className="slider-group"> <label>Насыщ.</label> <input type="range" min={0} max={200} value={avatarEditor.filters.saturate} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, saturate: e.target.value }, }))} /> </div> <div className="slider-group"> <label>Размытие</label> <input type="range" min={0} max={10} step={0.1} value={avatarEditor.filters.blur} onChange={(e) => setAvatarEditor((p) => ({ ...p, filters: { ...p.filters, blur: e.target.value }, }))} /> </div> </div>
              <button className="btn-primary" onClick={handleSaveAvatar}>Применить</button>
            </div>
          </Modal>
        )}

        {activeModal === "groupInfo" && (
          <Modal title="Group Info" onClose={() => setActiveModal(null)}>
            <div className="profile-hero"> <div className="profile-avatar-large">{room.substring(0, 2)}</div> 
            <div className="profile-name">{room}</div> <div className="profile-status">{groupMembers.length} members</div></div>
            <div className="settings-list" style={{ padding: "0 15px" }}>
              <div style={{ color: "#8774e1", padding: "10px 0", fontSize: "14px", fontWeight: "bold" }}>Members</div>
              
              {groupMembers.map((m, i) => ( 
                  <div 
                    key={i} 
                    className="settings-item" 
                    onClick={(e) => {
                        e.stopPropagation();
                        if(m.username !== username) {
                            socket.emit("get_user_profile", m.username);
                        }
                    }}
                  > 
                    <div className="friend-avatar" style={{ 
                        fontSize: 12, 
                        marginRight: 15,
                        backgroundImage: m.avatar_url ? `url(${m.avatar_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: m.avatar_url ? 'transparent' : 'white'
                    }}>
                        {m.username[0].toUpperCase()}
                    </div> 
                    
                    <div className="settings-label"> 
                        <div style={{ fontSize: "16px" }}>{m.username}</div> 
                        <div style={{ fontSize: "12px", color: "#888" }}>
                            {m.role === "owner" ? "owner" : "member"}
                            {m.username !== username && <span style={{marginLeft: 5, color: '#1a7bd6'}}>• Профиль</span>}
                        </div> 
                    </div> 
                    
                    {myRole === "owner" && m.role !== "owner" && m.username !== username && (
                        <button 
                            style={{ color: "#ff5959", background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: 10 }} 
                            onClick={(e) => {
                                e.stopPropagation();
                                socket.emit("remove_group_member", { room, username: m.username });
                            }}
                        >
                        &times;
                        </button>
                    )} 
                  </div> 
              ))}
            </div>
            <div style={{ padding: "20px" }}>
              <div className="action-card" onClick={() => { const n = prompt("Ник:"); if (n) socket.emit("add_group_member", { room, username: n }); }} style={{ marginBottom: 10, height: "auto", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "row" }}><svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 24 24"><path fill="#ffffff" d="M18 2h-6v2h-2v6h2V4h6V2zm0 8h-6v2h6v-2zm0-6h2v6h-2V4zM7 16h2v-2h12v2H9v4h12v-4h2v6H7v-6zM3 8h2v2h2v2H5v2H3v-2H1v-2h2V8z"/></svg> Добавить участника</div>
              <button className="btn-danger" style={{ textAlign: "center" }} onClick={leaveGroup}>{myRole === "owner" && room !== "General" ? "Delete Group" : "Leave Group"}</button>
            </div>
          </Modal>
        )}

        {activeModal === "userProfile" && viewProfileData && (
          <Modal title="Info" onClose={() => setActiveModal(null)}>
            <div className="profile-hero"> 
                <div className="profile-avatar-large" style={getAvatarStyle(viewProfileData.avatar_url)}>{!viewProfileData.avatar_url && viewProfileData.username[0]?.toUpperCase()}</div> 
                <div className="profile-name">{viewProfileData.display_name || viewProfileData.username}</div> 
                <div className="profile-status">@{viewProfileData.username}</div>
                <div style={{fontSize: 12, color: '#888', marginTop: 5}}>{viewProfileData.isFriend ? "В контактах" : ""}</div>
            </div>
            <div className="settings-list">
              {viewProfileData.bio && (<div className="settings-item"> <div className="settings-label"> <div style={{ fontSize: "16px" }}>{viewProfileData.bio}</div> <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Bio</div> </div> </div>)}
              {viewProfileData.phone && (<div className="settings-item"> <div className="settings-label"> <div style={{ fontSize: "16px" }}>{viewProfileData.phone}</div> <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>Mobile</div> </div> </div>)}
              <div className="settings-item" onClick={() => copyProfileLink(viewProfileData.username)}> 
                <div className="settings-icon"><IconShare/></div> 
                <div className="settings-label">Поделиться профилем</div>
              </div>
            </div>
            <div className="avatar-history" style={{ padding: "0 15px" }}>
              {avatarHistory.length > 0 && <h4>Old Avatars</h4>}
              <div className="avatar-history-container"> {avatarHistory.map((avatar) => ( <div key={avatar.id} className="avatar-history-item"> <img src={avatar.avatar_url} alt="old avatar" onClick={() => setImageModalSrc(avatar.avatar_url)} /> </div> ))} </div>
            </div>
            <div style={{ marginTop: "10px", background: "#212121", padding: "0 15px" }}>
              {viewProfileData.isFriend && (<div className="settings-item" onClick={() => removeFriend(viewProfileData.username)} style={{ color: "#ff5959" }}> <span className="settings-icon" style={{ color: "#ff5959" }}><svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24"><path fill="#ffffff" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17ZM5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14ZM5 5v14V5Z"/></svg></span> Delete Contact </div>)}
              <div className="settings-item" onClick={() => blockUser(viewProfileData.username)} style={{ color: "#ff5959", border: "none" }}> <span className="settings-icon" style={{ color: "#ff5959" }}><svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="#ffffff"><path fill="#ffffff" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-1.35-.438-2.6T18.3 7.1L7.1 18.3q1.05.825 2.3 1.263T12 20Zm-6.3-3.1L16.9 5.7q-1.05-.825-2.3-1.262T12 4Q8.65 4 6.325 6.325T4 12q0 1.35.437 2.6T5.7 16.9Z"/></svg></span> Block User </div>
            </div>
          </Modal>
        )}
      </div>
    );
}

export default Chat;