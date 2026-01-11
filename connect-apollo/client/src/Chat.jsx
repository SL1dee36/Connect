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
    const [myChats, setMyChats] = useState([]);
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

    // --- ФУНКЦИИ, ОБЕРНУТЫЕ В useCallback ---

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
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => { if (blob) resolve(blob); }, 'image/webp', 0.8);
        });
    }, [createImage]);

    const switchChat = useCallback((targetName) => {
        const getRoomId = (target) => myChats.includes(target) ? target : [username, target].sort().join("_");
        const roomId = getRoomId(targetName);
        
        if (roomId !== room) {
            setMyRole('member'); // Reset role on chat switch
            setRoom(roomId);
            localStorage.setItem("apollo_room", roomId);
            setMessageList([]);
            setHasMore(true);
            setIsLoadingHistory(false);
            previousScrollHeight.current = 0;
            setTypingText("");
            setAttachedFiles([]);
            setCurrentMessage("");
            // 'join_room' will be emitted by the useEffect that watches 'room'
        }
        if (isMobile) setShowMobileChat(true);
    }, [room, setRoom, username, isMobile, myChats]);

    const sendMessage = useCallback(async () => {
        if (!currentMessage.trim() && attachedFiles.length === 0) return;
        if (!room) { // Защита от отправки, если комната не определена
             console.error("Cannot send message, room is not defined.");
             return;
        }

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
    }, [currentMessage, attachedFiles, room, username, socket]);
    
    // --- ЭФФЕКТЫ ---

    // Глобальные слушатели (не зависят от комнаты)
    useEffect(() => {
        socket.emit("get_my_profile", username);

        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);

        const handleJoin = (data) => {
            setMyChats(prev => (!prev.includes(data.room) ? [...prev, data.room] : prev));
            switchChat(data.room);
            setActiveModal(null);
        };
        
        socket.on("user_groups", (groups) => {
            setMyChats(groups);
            const isCurrentRoomPrivate = room.includes('_');
            if (!isCurrentRoomPrivate && !groups.includes(room)) {
                switchChat("General");
            }
        });
        socket.on("friends_list", (list) => setFriends(list));
        socket.on("group_created", handleJoin);
        socket.on("group_joined", handleJoin);
        socket.on("left_group_success", (data) => {
            setMyChats(prev => prev.filter(c => c !== data.room));
            switchChat("General");
            setActiveModal(null);
        });
        socket.on("group_deleted", (data) => {
            setMyChats(prev => prev.filter(c => c !== data.room));
            if (room === data.room) switchChat("General");
            alert(`Группа "${data.room}" удалена владельцем.`);
        });
        socket.on("incoming_friend_request", (data) => setNotification(data));
        socket.on("friend_added", (data) => { setFriends(prev => [...prev, data.username]); alert(`${data.username} добавлен!`); });
        socket.on("friend_removed", (data) => {
            setFriends(prev => prev.filter(f => f !== data.username));
            const chatRoom = [username, data.username].sort().join("_");
            if (room === chatRoom) switchChat("General");
        });
        socket.on("request_declined", (data) => alert(`${data.from} отклонил заявку.`));
        socket.on("error_message", (data) => alert(data.msg));
        socket.on("info_message", (data) => alert(data.msg));
        socket.on("my_profile_data", (data) => { setMyProfile(data); setProfileForm({ bio: data.bio || "", phone: data.phone || ""}); });
        socket.on("user_profile_data", (data) => { setViewProfileData(data); setActiveModal("userProfile"); socket.emit("get_avatar_history", data.username) });
        socket.on("avatar_history_data", (history) => setAvatarHistory(history));
        socket.on("search_results", (results) => setSearchResults(results.filter(u => u.username !== username)));
        socket.on("search_groups_results", (results) => setSearchGroupResults(results));

        return () => {
            socket.off("user_groups");
            socket.off("friends_list");
            socket.off("group_created");
            socket.off("group_joined");
            socket.off("left_group_success");
            socket.off("group_deleted");
            socket.off("incoming_friend_request");
            socket.off("friend_added");
            socket.off("friend_removed");
            socket.off("request_declined");
            socket.off("error_message");
            socket.off("info_message");
            socket.off("my_profile_data");
            socket.off("user_profile_data");
            socket.off("avatar_history_data");
            socket.off("search_results");
            socket.off("search_groups_results");
            window.removeEventListener('resize', handleResize);
        };
    }, [socket, username, room, switchChat]);

    // Слушатели, зависящие от комнаты
    useEffect(() => {
        if (!room) return;

        socket.emit("join_room", { username, room });

        const onReceiveMessage = (data) => {
             if (data.room === room) setMessageList((list) => [...list, data]);
        };
        const onMessageDeleted = (deletedId) => setMessageList((prev) => prev.filter((msg) => msg.id !== deletedId));
        const onChatHistory = (history) => setMessageList(history);
        const onMoreMessagesLoaded = (history) => setMessageList((prev) => [...history, ...prev]);
        const onDisplayTyping = (data) => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            setTypingText(`${data.username} печатает...`);
            typingTimeoutRef.current = setTimeout(() => setTypingText(""), 3000);
        };
        const onGroupInfoData = (data) => {
            if (data.room === room) {
                setGroupMembers(data.members);
                setMyRole(data.myRole);
            }
        };
        const onGroupInfoUpdated = (data) => setGroupMembers(data.members);
        
        socket.on("receive_message", onReceiveMessage);
        socket.on("message_deleted", onMessageDeleted);
        socket.on("chat_history", onChatHistory);
        socket.on("more_messages_loaded", onMoreMessagesLoaded);
        socket.on("display_typing", onDisplayTyping);
        socket.on("group_info_data", onGroupInfoData);
        socket.on("group_info_updated", onGroupInfoUpdated);

        return () => {
            socket.off("receive_message", onReceiveMessage);
            socket.off("message_deleted", onMessageDeleted);
            socket.off("chat_history", onChatHistory);
            socket.off("more_messages_loaded", onMoreMessagesLoaded);
            socket.off("display_typing", onDisplayTyping);
            socket.off("group_info_data", onGroupInfoData);
            socket.off("group_info_updated", onGroupInfoUpdated);
        };
    }, [room, socket, username]);

    useEffect(() => {
        if (!isLoadingHistory && messageList.length > 0) {
            const lastMsg = messageList[messageList.length - 1];
            if(lastMsg && (lastMsg.author === username || !isLoadingHistory)) {
                 messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [messageList, username, isLoadingHistory]);

    useLayoutEffect(() => {
        if (chatBodyRef.current && previousScrollHeight.current > 0) {
            const newScrollHeight = chatBodyRef.current.scrollHeight;
            chatBodyRef.current.scrollTop = newScrollHeight - previousScrollHeight.current;
            previousScrollHeight.current = 0;
        }
    }, [messageList]);

    const handleScroll = (e) => {
        if (e.target.scrollTop === 0 && hasMore && !isLoadingHistory) {
            setIsLoadingHistory(true);
            previousScrollHeight.current = e.target.scrollHeight;
            socket.emit("load_more_messages", { room, offset: messageList.length });
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [currentMessage]);

    const handleDeleteMessage = useCallback((id) => {
        if (window.confirm("Удалить это сообщение?")) {
            socket.emit("delete_message", id);
        }
    }, [socket]);

    const onFileChange = useCallback((e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => setAvatarEditor(prev => ({ ...prev, image: reader.result, isOpen: true })), false);
            reader.readAsDataURL(file);
            setActiveModal(null);
        }
    }, []);

    const handleSaveAvatar = useCallback(async () => {
        if (!avatarEditor.croppedAreaPixels) return;
        const croppedImageBlob = await getCroppedImg(avatarEditor.image, avatarEditor.croppedAreaPixels, avatarEditor.filters);
        const formData = new FormData();
        formData.append('avatar', croppedImageBlob, 'avatar.webp');
        formData.append('username', username);
        try {
            const res = await fetch(`${BACKEND_URL}/upload-avatar`, { method: 'POST', body: formData });
            const data = await res.json();
            if(data.profile) setMyProfile(data.profile);
        } catch (error) {
            console.error('Avatar upload failed', error);
            alert('Ошибка загрузки аватара');
        } finally {
            setAvatarEditor({ isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 }});
        }
    }, [avatarEditor, getCroppedImg, username]);
    
    const startRecording = useCallback(async () => {
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
    }, []);

    const sendVoiceMessage = useCallback(async () => {
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
    }, [room, username, socket]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    }, []);

    const handleFileSelect = useCallback((e) => {
        const files = Array.from(e.target.files);
        if (attachedFiles.length + files.length > 10) { alert("Максимум 10 файлов"); return; }
        setAttachedFiles(prev => [...prev, ...files]);
        e.target.value = "";
    }, [attachedFiles]);

    const removeAttachment = useCallback((index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    const displayRoomName = myChats.includes(room) ? room : room.replace(username, "").replace("_", "");
    const isPrivateChat = !myChats.includes(room);
    
    const openGroupInfo = useCallback(() => {
        if (!isPrivateChat) {
            socket.emit("get_group_info", room);
            setActiveModal("groupInfo");
            setShowMenu(false);
        } else {
            socket.emit("get_user_profile", displayRoomName);
            setShowMenu(false);
        }
    }, [isPrivateChat, room, displayRoomName, socket]);

    const saveProfile = useCallback(() => {
        socket.emit("update_profile", { username, bio: profileForm.bio, phone: profileForm.phone });
        setActiveModal(null);
    }, [profileForm, username, socket]);

    const leaveGroup = useCallback(() => {
        if (window.confirm(myRole === 'owner' ? "Удалить группу?" : "Выйти из группы?")) {
            socket.emit("leave_group", { room });
        }
    }, [myRole, room, socket]);

    const removeFriend = useCallback((t) => {
        if (window.confirm(`Удалить ${t}?`)) {
            socket.emit("remove_friend", t);
            setActiveModal(null);
        }
    }, [socket]);

    const blockUser = useCallback((t) => {
        if (window.confirm(`Заблокировать ${t}?`)) {
            socket.emit("block_user", t);
            setActiveModal(null);
        }
    }, [socket]);

    const getAvatarStyle = (imgUrl) => imgUrl ? { backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent', border: '2px solid #333' } : {};
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

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
                    <div className="image-modal-content">
                        <img src={imageModalSrc} alt="Full view" />
                        <button className="close-img-btn" onClick={() => setImageModalSrc(null)}>&times;</button>
                    </div>
                </div>
            )}
            
            <input type="file" ref={avatarInputRef} style={{display: 'none'}} onChange={onFileChange} accept="image/*"/>

            <div className={`left-panel ${isMobile && showMobileChat ? 'hidden' : ''}`}>
                <div className="sidebar-top">
                    <div className="my-avatar" style={getAvatarStyle(myProfile.avatar_url)} onClick={() => { socket.emit("get_my_profile", username); socket.emit("get_avatar_history", username); setActiveModal('settings'); }}>
                        {!myProfile.avatar_url && username && username[0].toUpperCase()}
                    </div>
                    <button className="fab-btn" onClick={() => setActiveModal('actionMenu')}>+</button>
                </div>
                <div className="friends-list">
                    {myChats.map((chat, idx) => (
                        <div key={idx} className="friend-avatar" title={chat} onClick={() => switchChat(chat)}
                            style={{ background: chat === room ? '#f0f0f0' : '#333', border: chat === room ? '2px solid #2b95ff' : 'none', color: chat === room ? 'black' : 'white' }}>
                            {chat.substring(0, 2)}
                        </div>
                    ))}
                    {friends.length > 0 && <div className="divider">Контакты</div>}
                    {friends.map((friend, idx) => {
                        const isActive = [username, friend].sort().join("_") === room;
                        return <div key={idx} className="friend-avatar" onClick={() => switchChat(friend)} title={friend} style={{ background: isActive ? '#2b95ff' : '#444' }}>{friend[0].toUpperCase()}</div>
                    })}
                </div>
            </div>

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
                            {showMenu && (
                                <div className="dropdown-menu">
                                    <div className="menu-item" onClick={openGroupInfo}>ℹ️ Информация</div>
                                    {!isPrivateChat && <div className="menu-item" onClick={() => setActiveModal('groupInfo')}>➕ Добавить</div>}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="chat-body" ref={chatBodyRef} onScroll={handleScroll}>
                        {isLoadingHistory && <div style={{textAlign: 'center', fontSize: 12, color: '#666', padding: 10}}>Загрузка истории...</div>}
                        {messageList.map((msg, index) => (
                            <MessageItem 
                                key={msg.id || index} 
                                msg={msg} 
                                username={username} 
                                setImageModalSrc={setImageModalSrc}
                                onDelete={handleDeleteMessage}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-wrapper">
                        {attachedFiles.length > 0 && (
                            <div className="attachments-preview">
                                {attachedFiles.map((f, i) => (
                                    <div key={i} className="attachment-thumb">
                                        <img src={URL.createObjectURL(f)} alt="preview" />
                                        <button onClick={() => removeAttachment(i)}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <textarea 
                            ref={textareaRef}
                            value={currentMessage} 
                            placeholder="Написать сообщение..." 
                            className="chat-textarea"
                            onChange={(e) => { setCurrentMessage(e.target.value); socket.emit("typing", { room, username }) }} 
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                        <div className="input-toolbar">
                            <div className="toolbar-left">
                                <input type="file" style={{ display: 'none' }} multiple ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
                                <button className="tool-btn" onClick={() => fileInputRef.current.click()} title="Прикрепить фото">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                                </button>
                            </div>
                            <div className="toolbar-right">
                                {currentMessage.trim() || attachedFiles.length > 0 ? (
                                    <button className="send-pill-btn" onClick={sendMessage}> Отправить ↵ </button>
                                ) : (
                                    <button className={`mic-btn ${isRecording ? 'recording' : ''}`} onClick={isRecording ? stopRecording : startRecording}>
                                        {isRecording ? formatTime(recordingTime) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {activeModal === 'actionMenu' && ( <Modal title="Действия" onClose={() => setActiveModal(null)}> <div className="action-grid"> <div className="action-card" onClick={() => setActiveModal('createGroup')}> <span style={{ fontSize: 24 }}>📢</span> <div><div style={{ fontWeight: 'bold' }}>Создать Группу</div></div> </div> <div className="action-card" onClick={() => setActiveModal('searchGroup')}> <span style={{ fontSize: 24 }}>🔍</span> <div><div style={{ fontWeight: 'bold' }}>Найти Группу</div></div> </div> <div className="action-card" onClick={() => setActiveModal('addFriend')}> <span style={{ fontSize: 24 }}>👤</span> <div><div style={{ fontWeight: 'bold' }}>Найти Людей</div></div> </div> </div> </Modal> )}
            {activeModal === 'createGroup' && ( <Modal title="Создать группу" onClose={() => setActiveModal(null)}> <input className="modal-input" placeholder="Название..." value={newChatName} onChange={(e) => setNewChatName(e.target.value)} /> <button className="btn-primary" onClick={() => { if (newChatName) socket.emit("create_group", { room: newChatName, username }) }}>Создать</button> </Modal> )}
            {activeModal === 'searchGroup' && ( <Modal title="Поиск групп" onClose={() => { setActiveModal(null); setSearchGroupResults([]) }}> <input className="modal-input" placeholder="Название..." onChange={(e) => { if (e.target.value) socket.emit("search_groups", e.target.value) }} /> <div className="search-results"> {searchGroupResults.map((g, i) => ( <div key={i} className="search-item"> <span>{g.room}</span> {!myChats.includes(g.room) && <button className="add-btn-small" onClick={() => socket.emit("join_existing_group", { room: g.room, username })}>➜</button>} </div> ))} </div> </Modal> )}
            {activeModal === 'addFriend' && ( <Modal title="Поиск людей" onClose={() => { setActiveModal(null); setSearchResults([]) }}> <input className="modal-input" placeholder="@username" onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) socket.emit("search_users", e.target.value) }} /> <div className="search-results"> {searchResults.map((u, i) => ( <div key={i} className="search-item"> <div className="member-info"> <div className="friend-avatar" style={{ fontSize: 12 }}>{u.username[0]}</div> <span>{u.username}</span> </div> {!friends.includes(u.username) && <button className="add-btn-small" onClick={() => { socket.emit("send_friend_request", { fromUser: username, toUserSocketId: u.socketId }); alert('Sent!') }}>+</button>} </div> ))} </div> </Modal> )}
            
            {activeModal === 'settings' && (
                <Modal title="Профиль" onClose={() => setActiveModal(null)}>
                    <div className="profile-hero">
                        <div className="profile-avatar-large" style={getAvatarStyle(myProfile.avatar_url)}>{!myProfile.avatar_url && username && username[0].toUpperCase()}</div>
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
                                    <button className="delete-avatar-btn" onClick={() => socket.emit('delete_avatar', { avatarId: avatar.id })}>🗑</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="btn-primary" onClick={saveProfile}>Сохранить</button>
                    <button className="btn-danger" style={{ marginTop: 10 }} onClick={handleLogout}>Выйти</button>
                </Modal>
            )}

            {avatarEditor.isOpen && (
                <Modal title="Редактор Аватара" onClose={() => setAvatarEditor({ ...avatarEditor, isOpen: false })}>
                    <div className="avatar-editor-content">
                        <div className="crop-container">
                            <Cropper image={avatarEditor.image} crop={avatarEditor.crop} zoom={avatarEditor.zoom} aspect={1} onCropChange={(crop) => setAvatarEditor(p => ({...p, crop}))} onZoomChange={(zoom) => setAvatarEditor(p => ({...p, zoom}))} onCropComplete={(_, croppedAreaPixels) => setAvatarEditor(p => ({...p, croppedAreaPixels}))} imageStyle={{ filter: `brightness(${avatarEditor.filters.brightness}%) contrast(${avatarEditor.filters.contrast}%) saturate(${avatarEditor.filters.saturate}%) blur(${avatarEditor.filters.blur}px)` }} />
                        </div>
                        <div className="editor-controls">
                            <div className="slider-group"> <label>Zoom</label> <input type="range" min={1} max={3} step={0.1} value={avatarEditor.zoom} onChange={e => setAvatarEditor(p => ({...p, zoom: e.target.value}))}/> </div>
                            <div className="slider-group"> <label>Яркость</label> <input type="range" min={0} max={200} value={avatarEditor.filters.brightness} onChange={e => setAvatarEditor(p => ({...p, filters: {...p.filters, brightness: e.target.value}}))}/> </div>
                            <div className="slider-group"> <label>Контраст</label> <input type="range" min={0} max={200} value={avatarEditor.filters.contrast} onChange={e => setAvatarEditor(p => ({...p, filters: {...p.filters, contrast: e.target.value}}))}/> </div>
                            <div className="slider-group"> <label>Насыщ.</label> <input type="range" min={0} max={200} value={avatarEditor.filters.saturate} onChange={e => setAvatarEditor(p => ({...p, filters: {...p.filters, saturate: e.target.value}}))}/> </div>
                            <div className="slider-group"> <label>Размытие</label> <input type="range" min={0} max={10} step={0.1} value={avatarEditor.filters.blur} onChange={e => setAvatarEditor(p => ({...p, filters: {...p.filters, blur: e.target.value}}))}/> </div>
                        </div>
                        <button className="btn-primary" onClick={handleSaveAvatar}>Применить</button>
                    </div>
                </Modal>
            )}

            {activeModal === 'groupInfo' && ( <Modal title="Участники" onClose={() => setActiveModal(null)}> <div className="profile-hero"> <div className="profile-avatar-large">{room.substring(0, 2)}</div> <div className="profile-name">{room}</div> <div className="profile-status">{groupMembers.length} members</div> </div> <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 15 }}> {groupMembers.map((m, i) => ( <div key={i} className="member-item"> <div className="member-info"> <div className="friend-avatar" style={{ fontSize: 12 }}>{m.username[0]}</div> <div>{m.username} {m.role === 'owner' && <span style={{ fontSize: 10, color: '#FFD700', marginLeft: 5 }}>Owner</span>}</div> </div> {myRole === 'owner' && m.role !== 'owner' && m.username !== username && ( <button style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => socket.emit("remove_group_member", { room, username: m.username })}>&times;</button> )} </div> ))} </div> <div className="action-card" onClick={() => { const n = prompt("Ник:"); if (n) socket.emit("add_group_member", { room, username: n }) }} style={{ marginBottom: 10, justifyContent: 'center' }}><span>➕ Добавить</span></div> <button className="btn-danger" onClick={leaveGroup}>{myRole === 'owner' ? 'Удалить группу' : 'Покинуть группу'}</button> </Modal> )}
            
            {activeModal === 'userProfile' && viewProfileData && (
                <Modal title="Профиль" onClose={() => setActiveModal(null)}>
                    <div className="profile-hero">
                        <div className="profile-avatar-large" style={getAvatarStyle(viewProfileData.avatar_url)}>{!viewProfileData.avatar_url && viewProfileData.username[0]?.toUpperCase()}</div>
                        <div className="profile-name">{viewProfileData.username}</div>
                        {viewProfileData.isFriend && <div className="profile-status">В контактах</div>}
                    </div>
                    <div className="settings-list">
                        {viewProfileData.bio && <div className="settings-item"><span className="settings-icon">📝</span><div className="settings-label">{viewProfileData.bio}</div></div>}
                        {viewProfileData.phone && <div className="settings-item"><span className="settings-icon">📞</span><div className="settings-label">{viewProfileData.phone}</div></div>}
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