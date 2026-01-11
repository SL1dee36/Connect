import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from "./Modal";
import Cropper from 'react-easy-crop';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const MessageItem = React.memo(({ msg, username, setImageModalSrc, onDelete }) => {
    const isMine = msg.author === username;
    let content;

    if (msg.type === 'image') {
        content = <img src={msg.message} alt="attachment" className="chat-image" loading="lazy" onClick={() => setImageModalSrc(msg.message)} />;
    } else if (msg.type === 'gallery') {
        const images = JSON.parse(msg.message);
        content = (
            <div className="gallery-grid">
                {images.map((img, i) => (
                    <img key={i} src={img} alt="gallery" className="gallery-image" loading="lazy" onClick={() => setImageModalSrc(img)} />
                ))}
            </div>
        );
    } else if (msg.type === 'audio') {
        content = <audio controls src={msg.message} className="audio-player" />;
    } else {
        content = (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{color: isMine ? '#d1e8ff' : '#4da6ff'}} /> }}>
                {msg.message}
            </ReactMarkdown>
        );
    }

    return (
        <div className={`message ${isMine ? "mine" : "theirs"}`}>
            <div className="bubble">
                {content}
            </div>
            <div className="message-footer">
                <span className="meta">{msg.time} • {msg.author}</span>
                {isMine && (
                    <button className="delete-msg-btn" onClick={() => onDelete(msg.id)} title="Удалить">
                        🗑
                    </button>
                )}
            </div>
        </div>
    );
});


function Chat({ socket, username, room, setRoom, handleLogout }) {
    // State
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    const [friends, setFriends] = useState([]);
    const [myChats, setMyChats] = useState(["General"]); 
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    // UI
    const [activeModal, setActiveModal] = useState(null);
    const [notification, setNotification] = useState(null);
    const [typingText, setTypingText] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showMobileChat, setShowMobileChat] = useState(false);
    
    // Media
    const [imageModalSrc, setImageModalSrc] = useState(null);
    const [attachedFiles, setAttachedFiles] = useState([]); 
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    // Inputs & Search
    const [newChatName, setNewChatName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchGroupResults, setSearchGroupResults] = useState([]);

    // Profile & Avatars
    const [myProfile, setMyProfile] = useState({ bio: "", phone: "", avatar_url: "" });
    const [viewProfileData, setViewProfileData] = useState(null);
    const [profileForm, setProfileForm] = useState({ bio: "", phone: "" });
    const [groupMembers, setGroupMembers] = useState([]);
    const [myRole, setMyRole] = useState("member");
    const [avatarHistory, setAvatarHistory] = useState([]);
    const [avatarEditor, setAvatarEditor] = useState({
        isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1,
        croppedAreaPixels: null, filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 }
    });


    // Refs
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
    
    const createImage = useCallback((url) => 
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        }), 
    []);

    const getCroppedImg = useCallback(async (imageSrc, pixelCrop, filters) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;
        
        ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) blur(${filters.blur}px)`;
        ctx.drawImage(
            image,
            pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
            0, 0, pixelCrop.width, pixelCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
            }, 'image/webp', 0.8);
        });
    }, [createImage]);

    // --- DELETE HANDLER ---
    const handleDeleteMessage = useCallback((id) => {
        if (window.confirm("Удалить это сообщение?")) {
            socket.emit("delete_message", id);
        }
    }, [socket]);

    // --- INIT ---
    const switchChat = useCallback((targetName) => {
        console.log("[CHAT DEBUG] switchChat called with:", targetName);
        if (!targetName || typeof targetName !== 'string') return;
        
        const isGroupChat = targetName === "General" || myChats.includes(targetName);
        const roomId = isGroupChat ? targetName : [username, targetName].sort().join("_");
        
        if (roomId !== room) {
            setRoom(roomId);
            localStorage.setItem("apollo_room", roomId);
        }
        if (isMobile) setShowMobileChat(true);
    }, [room, setRoom, username, isMobile, myChats]);

    // ЭФФЕКТ №1: Глобальные слушатели
    useEffect(() => {
        console.log("[CHAT DEBUG] GLOBAL EFFECT MOUNTED");
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);

        // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

        const handleUserGroups = (groups) => {
            console.log("[CHAT DEBUG] SOCKET EVENT: user_groups received:", groups);
            
            if (!Array.isArray(groups)) return;

            // Фильтрация
            const validGroups = groups.filter(g => g && typeof g === 'string');
            const safeGroups = validGroups.includes("General") ? validGroups : ["General", ...validGroups];
            
            setMyChats(safeGroups);

            const currentRoom = localStorage.getItem("apollo_room") || "General";
            const isCurrentRoomPrivate = currentRoom.includes('_');

            if (!isCurrentRoomPrivate && !safeGroups.includes(currentRoom)) {
                console.log("[CHAT DEBUG] Current room invalid, switching to General");
                switchChat("General");
            }
        };

        const handleFriendsList = (list) => {
            console.log("[CHAT DEBUG] SOCKET EVENT: friends_list received:", list);
            if (Array.isArray(list)) {
                const validFriends = list.filter(f => f && typeof f === 'string');
                setFriends(validFriends);
            }
        };

        const handleSearchResults = (results) => setSearchResults(results.filter(u => u.username !== username));
        
        const handleJoin = (data) => {
            console.log("[CHAT DEBUG] SOCKET EVENT: group_created/joined", data);
            setMyChats(prev => (!prev.includes(data.room) ? [...prev, data.room] : prev));
            switchChat(data.room);
            setActiveModal(null);
        };

        const handleLeftGroup = (data) => {
            setMyChats(prev => prev.filter(c => c !== data.room));
            switchChat("General");
            setActiveModal(null);
        };

        const handleGroupDeleted = (data) => {
            setMyChats(prev => prev.filter(c => c !== data.room));
            const currentRoom = localStorage.getItem("apollo_room") || "General";
            if (currentRoom === data.room) switchChat("General");
            alert(`Группа "${data.room}" удалена владельцем.`);
        };

        const handleFriendAdded = (data) => { 
            setFriends(prev => [...prev, data.username]); 
            alert(`${data.username} добавлен!`); 
        };

        const handleFriendRemoved = (data) => {
            setFriends(prev => prev.filter(f => f !== data.username));
            const chatRoom = [username, data.username].sort().join("_");
            const currentRoom = localStorage.getItem("apollo_room") || "General";
            if (currentRoom === chatRoom) switchChat("General");
        };

        const handleMyProfile = (data) => { setMyProfile(data); setProfileForm({ bio: data.bio || "", phone: data.phone || ""}); };
        const handleUserProfile = (data) => { setViewProfileData(data); setActiveModal("userProfile"); socket.emit("get_avatar_history", data.username) };
        const handleGroupInfoUpdated = (data) => setGroupMembers(data.members);
        const handleMessageDeleted = (deletedId) => setMessageList((prev) => prev.filter((msg) => msg.id !== deletedId));
        const handleRequestDeclined = (data) => alert(`${data.from} отклонил заявку.`);
        const handleError = (data) => { console.error("[CHAT DEBUG] SOCKET ERROR:", data); alert(data.msg); };
        const handleInfo = (data) => alert(data.msg);

        // --- ПОДПИСЫВАЕМСЯ ---
        socket.on("user_groups", handleUserGroups);
        socket.on("friends_list", handleFriendsList);
        socket.on("search_results", handleSearchResults);
        socket.on("search_groups_results", setSearchGroupResults);
        socket.on("group_created", handleJoin);
        socket.on("group_joined", handleJoin);
        socket.on("left_group_success", handleLeftGroup);
        socket.on("group_deleted", handleGroupDeleted);
        socket.on("incoming_friend_request", setNotification);
        socket.on("friend_added", handleFriendAdded);
        socket.on("friend_removed", handleFriendRemoved);
        socket.on("request_declined", handleRequestDeclined);
        socket.on("error_message", handleError);
        socket.on("info_message", handleInfo);
        socket.on("my_profile_data", handleMyProfile);
        socket.on("user_profile_data", handleUserProfile);
        socket.on("avatar_history_data", setAvatarHistory);
        socket.on("group_info_updated", handleGroupInfoUpdated);
        socket.on("message_deleted", handleMessageDeleted);

        // --- ЗАПРОС ДАННЫХ (С ЗАДЕРЖКОЙ) ---
        // Ждем 500мс, чтобы App.jsx успел отправить 'authenticate' и сервер сохранил username
        const timer = setTimeout(() => {
            console.log("[CHAT DEBUG] Emitting get_initial_data...");
            socket.emit("get_initial_data");
            socket.emit("get_my_profile", username);
        }, 500);

        // --- ОЧИСТКА ---
        return () => {
            clearTimeout(timer);
            console.log("[CHAT DEBUG] GLOBAL EFFECT UNMOUNTED");
            window.removeEventListener('resize', handleResize);
            
            socket.off("user_groups", handleUserGroups);
            socket.off("friends_list", handleFriendsList);
            socket.off("search_results", handleSearchResults);
            socket.off("search_groups_results", setSearchGroupResults);
            socket.off("group_created", handleJoin);
            socket.off("group_joined", handleJoin);
            socket.off("left_group_success", handleLeftGroup);
            socket.off("group_deleted", handleGroupDeleted);
            socket.off("incoming_friend_request", setNotification);
            socket.off("friend_added", handleFriendAdded);
            socket.off("friend_removed", handleFriendRemoved);
            socket.off("request_declined", handleRequestDeclined);
            socket.off("error_message", handleError);
            socket.off("info_message", handleInfo);
            socket.off("my_profile_data", handleMyProfile);
            socket.off("user_profile_data", handleUserProfile);
            socket.off("avatar_history_data", setAvatarHistory);
            socket.off("group_info_updated", handleGroupInfoUpdated);
            socket.off("message_deleted", handleMessageDeleted);
        };
    }, [socket, username, switchChat]);

    // ЭФФЕКТ №2: Логика конкретной комнаты
    useEffect(() => {
        if (!room) return;
        console.log("[CHAT DEBUG] Joining room:", room);

        setMessageList([]);
        setHasMore(true);
        setTypingText("");
        setAttachedFiles([]);
        setCurrentMessage("");
        setIsLoadingHistory(true);
        
        socket.emit("join_room", { username, room });

        const handleReceiveMessage = (data) => {
             if (data.room === room) {
                setMessageList((list) => [...list, data]);
             }
        };

        const handleChatHistory = (history) => {
            setMessageList(history);
            setHasMore(history.length >= 30);
            setIsLoadingHistory(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50);
        };

        const handleMoreMessages = (history) => {
            setMessageList((prev) => [...history, ...prev]);
            setHasMore(history.length >= 30);
            setIsLoadingHistory(false);
        };

        const handleNoMoreMessages = () => {
            setHasMore(false);
            setIsLoadingHistory(false);
        };

        const handleDisplayTyping = (data) => {
            if (data.room === room) {
                setTypingText(`${data.username} печатает...`);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingText(""), 3000);
            }
        };
        
        const handleGroupInfo = (data) => {
            if (data.room === room) {
                setGroupMembers(data.members);
                setMyRole(data.myRole);
            }
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("chat_history", handleChatHistory);
        socket.on("more_messages_loaded", handleMoreMessages);
        socket.on("no_more_messages", handleNoMoreMessages);
        socket.on("display_typing", handleDisplayTyping);
        socket.on("group_info_data", handleGroupInfo);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("chat_history", handleChatHistory);
            socket.off("more_messages_loaded", handleMoreMessages);
            socket.off("no_more_messages", handleNoMoreMessages);
            socket.off("display_typing", handleDisplayTyping);
            socket.off("group_info_data", handleGroupInfo);
        };
    }, [room, socket, username]);

    // --- SCROLL MANAGEMENT ---
    useEffect(() => {
        if (!isLoadingHistory && messageList.length > 0) {
            const lastMsg = messageList[messageList.length - 1];
            if(lastMsg && (lastMsg.author === username || !isLoadingHistory)) {
                 messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [messageList, username, isLoadingHistory]);

    useLayoutEffect(() => {
        if (chatBodyRef.current && previousScrollHeight.current !== 0) {
            const newScrollHeight = chatBodyRef.current.scrollHeight;
            const diff = newScrollHeight - previousScrollHeight.current;
            if (diff > 0) chatBodyRef.current.scrollTop = diff;
        }
    }, [messageList]);

    const handleScroll = (e) => {
        const scrollTop = e.target.scrollTop;
        if (scrollTop === 0 && hasMore && !isLoadingHistory && messageList.length > 0) {
            setIsLoadingHistory(true);
            previousScrollHeight.current = e.target.scrollHeight;
            socket.emit("load_more_messages", { room, offset: messageList.length });
        }
    };

    // --- AUTO RESIZE TEXTAREA ---
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [currentMessage]);

    // --- FUNCTIONS ---
    const displayRoomName = (myChats.includes(room)) ? room : room.replace(username, "").replace("_", "");
    const isPrivateChat = !myChats.includes(room);

    // --- AVATAR FUNCTIONS ---
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
                setMyProfile(data.profile);
            }
        } catch (error) {
            console.error('Avatar upload failed', error);
            alert('Ошибка загрузки аватара');
        } finally {
            setAvatarEditor({ isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 }});
        }
    };
    
    // --- RECORDING ---
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
        } catch (err) { alert("Не удалось получить доступ к микрофону"); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const sendVoiceMessage = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice_message.webm');

        try {
            const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.url) {
                const messageData = { room, author: username, message: data.url, type: 'audio', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
                socket.emit("send_message", messageData);
            }
        } catch (err) { console.error("Audio upload error", err); }
    };

    // --- SENDING ---
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (attachedFiles.length + files.length > 10) { alert("Максимум 10 файлов"); return; }
        setAttachedFiles(prev => [...prev, ...files]);
        e.target.value = "";
    };

    const removeAttachment = (index) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

    const sendMessage = async () => {
        if (!currentMessage.trim() && attachedFiles.length === 0) return;
        previousScrollHeight.current = 0;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (attachedFiles.length > 0) {
            const formData = new FormData();
            attachedFiles.forEach(file => formData.append('files', file));
            try {
                const response = await fetch(`${BACKEND_URL}/upload-multiple`, { method: 'POST', body: formData });
                const data = await response.json();
                if (data.urls && data.urls.length > 0) {
                    let msgType = data.urls.length === 1 ? 'image' : 'gallery';
                    let msgContent = data.urls.length === 1 ? data.urls[0] : JSON.stringify(data.urls);
                    socket.emit("send_message", { room, author: username, message: msgContent, type: msgType, time });
                }
            } catch (err) { alert("Ошибка отправки файлов"); }
            setAttachedFiles([]);
        }

        if (currentMessage.trim()) {
            socket.emit("send_message", { room, author: username, message: currentMessage, type: 'text', time });
            setCurrentMessage("");
        }
    };

    // --- UI HELPERS ---
    const openGroupInfo = () => {
        if (!isPrivateChat) { socket.emit("get_group_info", room); setActiveModal("groupInfo"); setShowMenu(false); }
        else { socket.emit("get_user_profile", displayRoomName); setShowMenu(false); }
    };

    const saveProfile = () => { socket.emit("update_profile", { username, bio: profileForm.bio, phone: profileForm.phone }); setActiveModal(null); };
    const leaveGroup = () => { if (window.confirm(myRole === 'owner' ? "Удалить группу?" : "Выйти из группы?")) socket.emit("leave_group", { room }); };
    const removeFriend = (t) => { if (window.confirm(`Удалить ${t}?`)) { socket.emit("remove_friend", t); setActiveModal(null); }};
    const blockUser = (t) => { if (window.confirm(`Заблокировать ${t}?`)) { socket.emit("block_user", t); setActiveModal(null); }};
    const getAvatarStyle = (imgUrl) => imgUrl ? { backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent', border: '2px solid #333' } : {};
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- RENDER ---
    return (
        <div className={`main-layout ${isMobile ? 'mobile-mode' : ''}`}>
            {notification && (
                <div className="notification-toast">
                    <div style={{ fontWeight: 'bold', marginBottom: 5 }}>🔔 {notification.from}</div>
                    <div style={{ fontSize: 12, marginBottom: 10 }}>Заявка в друзья</div>
                    <div className="notification-actions">
                        <button className="btn-accept" onClick={() => { socket.emit("accept_friend_request", { fromSocketId: notification.socketId, toSocketId: socket.id }); setNotification(null); }}>Да</button>
                        <button className="btn-decline" onClick={() => { socket.emit("decline_friend_request", { fromSocketId: notification.socketId }); setNotification(null); }}>Нет</button>
                    </div>
                </div>
            )}

            {imageModalSrc && (
                <div className="image-modal-overlay" onClick={() => setImageModalSrc(null)}>
                    <div className="image-modal-content"> <img src={imageModalSrc} alt="Full view" /> <button className="close-img-btn" onClick={() => setImageModalSrc(null)}>&times;</button> </div>
                </div>
            )}
            
            <input type="file" ref={avatarInputRef} style={{display: 'none'}} onChange={onFileChange} accept="image/*"/>

            {/* SIDEBAR */}
            <div className={`left-panel ${isMobile && showMobileChat ? 'hidden' : ''}`}>
                <div className="sidebar-top">
                    <div className="my-avatar" style={getAvatarStyle(myProfile.avatar_url)} onClick={() => { socket.emit("get_my_profile", username); socket.emit("get_avatar_history", username); setActiveModal('settings'); }}>
                        {!myProfile.avatar_url && username[0].toUpperCase()}
                    </div>
                    <button className="fab-btn" onClick={() => setActiveModal('actionMenu')}>+</button>
                </div>
                <div className="friends-list">
                    {/* Исправлен баг с "0" и добавлена фильтрация */}
                    {myChats.filter(chat => typeof chat === 'string').map((chat, idx) => ( 
                        <div key={idx} className="friend-avatar" title={chat} onClick={() => switchChat(chat)} style={{ background: chat === room ? '#f0f0f0' : '#333', border: chat === room ? '2px solid #2b95ff' : 'none', color: chat === room ? 'black' : 'white' }}> 
                            {chat.substring(0, 2)} 
                        </div> 
                    ))}
                    
                    {friends.length > 0 && <div className="divider">Контакты</div>}
                    
                    {friends.filter(f => typeof f === 'string').map((friend, idx) => { 
                        const isActive = [username, friend].sort().join("_") === room; 
                        return (
                            <div key={idx} className="friend-avatar" onClick={() => switchChat(friend)} title={friend} style={{ background: isActive ? '#2b95ff' : '#444' }}>
                                {friend[0] ? friend[0].toUpperCase() : '?'}
                            </div> 
                        )
                    })}
                </div>
            </div>

            {/* CHAT */}
            <div className={`right-panel ${isMobile && !showMobileChat ? 'hidden' : ''}`}>
                <div className="glass-chat">
                    <div className="chat-header">
                        <div className="header-left">
                            {isMobile && <button className="back-btn" onClick={() => setShowMobileChat(false)}>❮</button>}
                            <div onClick={openGroupInfo} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: 0 }}>{displayRoomName}</h3>
                                <span style={{ fontSize: 12, color: '#777' }}>{typingText || (!isPrivateChat && groupMembers.length > 0 ? `${groupMembers.length} участников` : '')}</span>
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>&#8942;</button>
                            {showMenu && ( <div className="dropdown-menu"> <div className="menu-item" onClick={openGroupInfo}>ℹ️ Информация</div> {!isPrivateChat && <div className="menu-item" onClick={() => setActiveModal('groupInfo')}>➕ Добавить</div>} </div> )}
                        </div>
                    </div>
                    
                    <div className="chat-body" ref={chatBodyRef} onScroll={handleScroll}>
                        {isLoadingHistory && <div style={{textAlign: 'center', fontSize: 12, color: '#666', padding: 10}}>Загрузка истории...</div>}
                        {messageList.map((msg, index) => ( <MessageItem key={msg.id || index} msg={msg} username={username} setImageModalSrc={setImageModalSrc} onDelete={handleDeleteMessage}/> ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-wrapper">
                        {attachedFiles.length > 0 && (
                            <div className="attachments-preview"> {attachedFiles.map((f, i) => ( <div key={i} className="attachment-thumb"> <img src={URL.createObjectURL(f)} alt="preview" /> <button onClick={() => removeAttachment(i)}>&times;</button> </div> ))} </div>
                        )}
                        <textarea ref={textareaRef} value={currentMessage} placeholder="Написать сообщение..." className="chat-textarea" onChange={(e) => { setCurrentMessage(e.target.value); socket.emit("typing", { room, username }) }} onKeyDown={handleKeyDown} rows={1}/>
                        <div className="input-toolbar">
                            <div className="toolbar-left">
                                <input type="file" style={{ display: 'none' }} multiple ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                                <button className="tool-btn" onClick={() => fileInputRef.current.click()} title="Прикрепить фото">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                                    </svg>
                                </button>
                            </div>
                            <div className="toolbar-right">
                                {currentMessage.trim() || attachedFiles.length > 0 ? (
                                    <button className="send-pill-btn" onClick={sendMessage}> Отправить ↵ </button>
                                ) : (
                                    <button className={`mic-btn ${isRecording ? 'recording' : ''}`} onClick={isRecording ? stopRecording : startRecording}>
                                        {isRecording ? formatTime(recordingTime) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {activeModal === 'actionMenu' && ( <Modal title="Действия" onClose={() => setActiveModal(null)}> <div className="action-grid"> <div className="action-card" onClick={() => setActiveModal('createGroup')}> <span style={{ fontSize: 24 }}>📢</span> <div><div style={{ fontWeight: 'bold' }}>Создать Группу</div></div> </div> <div className="action-card" onClick={() => setActiveModal('searchGroup')}> <span style={{ fontSize: 24 }}>🔍</span> <div><div style={{ fontWeight: 'bold' }}>Найти Группу</div></div> </div> <div className="action-card" onClick={() => setActiveModal('addFriend')}> <span style={{ fontSize: 24 }}>👤</span> <div><div style={{ fontWeight: 'bold' }}>Найти Людей</div></div> </div> </div> </Modal> )}
            {activeModal === 'createGroup' && ( <Modal title="Создать группу" onClose={() => setActiveModal(null)}> <input className="modal-input" placeholder="Название..." value={newChatName} onChange={(e) => setNewChatName(e.target.value)} /> <button className="btn-primary" onClick={() => { if (newChatName) socket.emit("create_group", { room: newChatName, username }) }}>Создать</button> </Modal> )}
            {activeModal === 'searchGroup' && ( <Modal title="Поиск групп" onClose={() => { setActiveModal(null); setSearchGroupResults([]) }}> <input className="modal-input" placeholder="Название..." onChange={(e) => { if (e.target.value) socket.emit("search_groups", e.target.value) }} /> <div className="search-results"> {searchGroupResults.map((g, i) => ( <div key={i} className="search-item"> <span>{g.room}</span> {!myChats.includes(g.room) && <button className="add-btn-small" onClick={() => socket.emit("join_existing_group", { room: g.room, username })}>➜</button>} </div> ))} </div> </Modal> )}
            {activeModal === 'addFriend' && ( <Modal title="Поиск людей" onClose={() => { setActiveModal(null); setSearchResults([]) }}> <input className="modal-input" placeholder="@username" onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) socket.emit("search_users", e.target.value) }} /> <div className="search-results"> {searchResults.map((u, i) => ( <div key={i} className="search-item"> <div className="member-info"> <div className="friend-avatar" style={{ fontSize: 12 }}>{u.username[0]}</div> <span>{u.username}</span> </div> {!friends.includes(u.username) && <button className="add-btn-small" onClick={() => { socket.emit("send_friend_request", { fromUser: username, toUserSocketId: u.socketId }); alert('Sent!') }}>+</button>} </div> ))} </div> </Modal> )}
            
            {activeModal === 'settings' && (
                <Modal title="Профиль" onClose={() => setActiveModal(null)}>
                    <div className="profile-hero">
                        <div className="profile-avatar-large" style={getAvatarStyle(myProfile.avatar_url)}>{!myProfile.avatar_url && username[0].toUpperCase()}</div>
                        <div className="profile-name">{username}</div>
                        <button className="change-avatar-btn" onClick={() => avatarInputRef.current.click()}>Сменить фото</button>
                    </div>
                    <div className="form-container">
                        <div className="input-group"> <label>О себе</label> <input className="modal-input" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="..." /> </div>
                        <div className="input-group"> <label>Телефон</label> <input className="modal-input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="..." /> </div>
                    </div>
                    <div className="avatar-history">
                        <h4>История аватаров</h4>
                        <div className="avatar-history-container">
                            {avatarHistory.map(avatar => (
                                <div key={avatar.id} className="avatar-history-item">
                                    <img src={avatar.avatar_url} alt="old avatar" onClick={() => setImageModalSrc(avatar.avatar_url)} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                      {viewProfileData.isFriend && <div className="settings-item" onClick={() => removeFriend(viewProfileData.username)} style={{ color: 'orange' }}><span className="settings-icon">💔</span><div className="settings-label">Удалить из друзей</div></div>}
                      <div className="settings-item" onClick={() => blockUser(viewProfileData.username)} style={{ color: 'red' }}><span className="settings-icon">🚫</span><div className="settings-label">Заблокировать</div></div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default Chat;