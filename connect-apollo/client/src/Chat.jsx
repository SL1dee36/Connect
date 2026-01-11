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

const IconDoubleCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft: 4, display: 'inline-block', verticalAlign: 'middle'}}>
        <path fill="currentColor" d="m18 7l-1.41-1.41l-6.34 6.34l1.41 1.41L18 7zm4.24-1.41L11.66 16.17L7.48 12l-1.41 1.41L11.66 19l12-12l-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12L.41 13.41z"/>
    </svg>
);


// --- HELPER FUNCTION FOR TIMER ---
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

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
        <div className={`message ${isMine ? "mine" : "theirs"}`} style={{ opacity: msg.status === 'pending' ? 0.7 : 1 }}>
            <div className="bubble">
                {content}
            </div>
            <div className="message-footer">
                <span className="meta" style={{display: 'flex', alignItems: 'center'}}>
                    {msg.time} • {msg.author}
                    {isMine && (
                        <>
                           {msg.status === 'pending' && <IconClock />}
                           {msg.status === 'sent' && <IconCheck />}
                        </>
                    )}
                </span>
                {isMine && msg.status !== 'pending' && (
                    <button className="delete-msg-btn" onClick={() => onDelete(msg.id)} title="Удалить">
                        🗑
                    </button>
                )}
            </div>
        </div>
    );
});


function Chat({ socket, username, room, setRoom, handleLogout }) {
    // --- STATE С "ПАМЯТЬЮ" (LocalStorage) ---
    
    const [myChats, setMyChats] = useState(() => {
        try {
            const saved = localStorage.getItem("apollo_my_chats");
            return saved ? JSON.parse(saved) : ["General"];
        } catch (e) { return ["General"]; }
    });

    const [friends, setFriends] = useState(() => {
        try {
            const saved = localStorage.getItem("apollo_friends");
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [myProfile, setMyProfile] = useState(() => {
        try {
            const saved = localStorage.getItem("apollo_my_profile");
            return saved ? JSON.parse(saved) : { bio: "", phone: "", avatar_url: "" };
        } catch (e) { return { bio: "", phone: "", avatar_url: "" }; }
    });

    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
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
    
    // Search Optimizations (Debounce)
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchGroupResults, setSearchGroupResults] = useState([]);

    // Profile & Avatars
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
    
    // --- ЭФФЕКТЫ СОХРАНЕНИЯ В LOCALSTORAGE ---
    useEffect(() => localStorage.setItem("apollo_my_chats", JSON.stringify(myChats)), [myChats]);
    useEffect(() => localStorage.setItem("apollo_friends", JSON.stringify(friends)), [friends]);
    useEffect(() => localStorage.setItem("apollo_my_profile", JSON.stringify(myProfile)), [myProfile]);


    // --- DEBOUNCED SEARCH EFFECT ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim()) {
                setIsSearching(true);
                console.log(`[SEARCH] Sending query: "${searchQuery}" for modal: ${activeModal}`);
                
                if (activeModal === 'addFriend') {
                    socket.emit("search_users", searchQuery);
                } else if (activeModal === 'searchGroup') {
                    socket.emit("search_groups", searchQuery);
                }
            } else {
                setSearchResults([]);
                setSearchGroupResults([]);
                setIsSearching(false);
            }
        }, 500); // 500ms задержка

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, activeModal, socket]);


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
        if (!targetName || typeof targetName !== 'string') return;
        
        const isGroupChat = targetName === "General" || myChats.includes(targetName);
        const roomId = isGroupChat ? targetName : [username, targetName].sort().join("_");
        
        if (roomId !== room) {
            setRoom(roomId);
            localStorage.setItem("apollo_room", roomId);
        }

        if (isMobile) {
            setShowMobileChat(true);
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    }, [room, setRoom, username, isMobile, myChats]);

    // ЭФФЕКТ №1: Глобальные слушатели
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);

        // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

        const handleUserGroups = (groups) => {
            if (!Array.isArray(groups)) return;
            const validGroups = groups.filter(g => g && typeof g === 'string');
            const safeGroups = validGroups.includes("General") ? validGroups : ["General", ...validGroups];
            setMyChats(safeGroups); 
        };

        const handleFriendsList = (list) => {
            if (Array.isArray(list)) {
                const validFriends = list.filter(f => f && typeof f === 'string');
                setFriends(validFriends);
            }
        };

        // --- ИСПРАВЛЕННЫЙ ПОИСК ---
        const handleSearchResults = (results) => {
            console.log("[SEARCH] Users results received:", results);
            // Если пришел null или не массив, ставим пустой массив
            const safeResults = Array.isArray(results) ? results : [];
            // Фильтруем себя, чтобы не искать себя
            setSearchResults(safeResults.filter(u => u.username !== username));
            setIsSearching(false);
        };

        const handleSearchGroupResults = (results) => {
             console.log("[SEARCH] Groups results received:", results);
             const safeResults = Array.isArray(results) ? results : [];
             setSearchGroupResults(safeResults);
             setIsSearching(false);
        };
        
        const handleJoin = (data) => {
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

        const handleMyProfile = (data) => { 
            setMyProfile(data); 
            setProfileForm({ bio: data.bio || "", phone: data.phone || ""}); 
        };

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
        socket.on("search_groups_results", handleSearchGroupResults);
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

        // --- ЗАПРОС ДАННЫХ ---
        const timer = setTimeout(() => {
            socket.emit("get_initial_data");
            socket.emit("get_my_profile", username);
        }, 300);

        // --- ОЧИСТКА ---
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
            
            socket.off("user_groups", handleUserGroups);
            socket.off("friends_list", handleFriendsList);
            socket.off("search_results", handleSearchResults);
            socket.off("search_groups_results", handleSearchGroupResults);
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
        
        setMessageList([]);
        setHasMore(true);
        setTypingText("");
        setAttachedFiles([]);
        setCurrentMessage("");
        setIsLoadingHistory(true);
        
        socket.emit("join_room", { username, room });

        const handleReceiveMessage = (data) => {
             if (data.room === room) {
                setMessageList((list) => {
                    // Check if we already have this message (optimistic update deduction)
                    if (data.author === username && data.tempId) {
                         const exists = list.find(m => m.tempId === data.tempId);
                         if (exists) {
                             // Update existing optimistic message just in case (though callback does it too)
                             return list.map(m => m.tempId === data.tempId ? { ...data, status: 'sent' } : m);
                         }
                    }
                    return [...list, data];
                });
             }
        };

        const handleChatHistory = (history) => {
            // History messages are always 'sent'
            const processedHistory = history.map(msg => ({ ...msg, status: 'sent' }));
            setMessageList(processedHistory);
            setHasMore(history.length >= 30);
            setIsLoadingHistory(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50);
        };

        const handleMoreMessages = (history) => {
            const processedHistory = history.map(msg => ({ ...msg, status: 'sent' }));
            setMessageList((prev) => [...processedHistory, ...prev]);
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
    const getAvatarStyle = (imgUrl) => imgUrl ? { backgroundImage: `url(${imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent', border: '2px solid #333' } : {};

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
                // For voice/files, we can use the same logic if we want, but keeping it simple for now
                // Voice messages are sent directly to socket here
                const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const tempId = Date.now();
                const optimisticMsg = { 
                    room, 
                    author: username, 
                    message: data.url, 
                    type: 'audio', 
                    time, 
                    status: 'pending', 
                    tempId,
                    id: tempId
                };
                
                setMessageList(prev => [...prev, optimisticMsg]);
                
                socket.emit("send_message", optimisticMsg, (res) => {
                     if (res && res.status === 'ok') {
                        setMessageList(prev => prev.map(m => 
                            m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m
                        ));
                     }
                });
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
                    
                    const tempId = Date.now() + Math.random();
                    const optimisticMsg = { 
                        room, 
                        author: username, 
                        message: msgContent, 
                        type: msgType, 
                        time, 
                        status: 'pending', 
                        tempId,
                        id: tempId 
                    };
                    
                    setMessageList(prev => [...prev, optimisticMsg]);

                    socket.emit("send_message", optimisticMsg, (res) => {
                         if (res && res.status === 'ok') {
                            setMessageList(prev => prev.map(m => 
                                m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m
                            ));
                         }
                    });
                }
            } catch (err) { alert("Ошибка отправки файлов"); }
            setAttachedFiles([]);
        }

        if (currentMessage.trim()) {
            const tempId = Date.now();
            const optimisticMsg = { 
                room, 
                author: username, 
                message: currentMessage, 
                type: 'text', 
                time, 
                status: 'pending', 
                tempId, 
                id: tempId 
            };

            // 1. Optimistic Update
            setMessageList(prev => [...prev, optimisticMsg]);
            setCurrentMessage("");

            // 2. Send with callback
            socket.emit("send_message", optimisticMsg, (res) => {
                 if (res && res.status === 'ok') {
                    setMessageList(prev => prev.map(m => 
                        m.tempId === tempId ? { ...m, id: res.id, status: 'sent' } : m
                    ));
                 }
            });
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
                    <div className="sidebar-header-content">
                        <div className="my-avatar" 
                             style={getAvatarStyle(myProfile.avatar_url)} 
                             onClick={() => { socket.emit("get_my_profile", username); socket.emit("get_avatar_history", username); setActiveModal('settings'); }}>
                            {!myProfile.avatar_url && username[0].toUpperCase()}
                        </div>
                        {isMobile && <div className="mobile-app-title">Chats</div>}
                    </div>
                    <button className="fab-btn" onClick={() => setActiveModal('actionMenu')}>+</button>
                </div>

                <div className="friends-list">
                    {myChats.filter(chat => chat && typeof chat === 'string').map((chat, idx) => ( 
                        <div key={idx} className="chat-list-item" onClick={() => switchChat(chat)}>
                            <div className="friend-avatar" style={{ background: chat === room ? '#2b95ff' : '#333', color: 'white' }}> 
                                {chat.substring(0, 2)} 
                            </div>
                            <div className="chat-info-mobile">
                                <div className="chat-name">{chat}</div>
                                <div className="chat-preview">Нажмите, чтобы открыть</div>
                            </div>
                        </div>
                    ))}
                    
                    {friends.length > 0 && <div className="divider">Контакты</div>}
                    
                    {friends.filter(f => f && typeof f === 'string').map((friend, idx) => { 
                        const isActive = [username, friend].sort().join("_") === room; 
                        return (
                            <div key={idx} className="chat-list-item" onClick={() => switchChat(friend)}>
                                <div className="friend-avatar" style={{ background: isActive ? '#2b95ff' : '#444' }}>
                                    {friend[0] ? friend[0].toUpperCase() : '?'}
                                </div>
                                <div className="chat-info-mobile">
                                    <div className="chat-name">{friend}</div>
                                    <div className="chat-preview">Личное сообщение</div>
                                </div>
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
            
            {activeModal === 'searchGroup' && ( 
                <Modal title="Поиск групп" onClose={() => { setActiveModal(null); setSearchGroupResults([]); setSearchQuery(""); }}> 
                    <input className="modal-input" placeholder="Название..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> 
                    {isSearching && <div style={{textAlign: 'center', color: '#888', padding: 10}}>Поиск...</div>}
                    <div className="search-results"> 
                        {searchGroupResults.length === 0 && searchQuery && !isSearching && <div style={{textAlign: 'center', color: '#666', padding: 10}}>Ничего не найдено</div>}
                        {searchGroupResults.map((g, i) => ( <div key={i} className="search-item"> <span>{g.room}</span> {!myChats.includes(g.room) && <button className="add-btn-small" onClick={() => socket.emit("join_existing_group", { room: g.room, username })}>➜</button>} </div> ))} 
                    </div> 
                </Modal> 
            )}
            
            {activeModal === 'addFriend' && ( 
                <Modal title="Поиск людей" onClose={() => { setActiveModal(null); setSearchResults([]); setSearchQuery(""); }}> 
                    <input className="modal-input" placeholder="@username" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> 
                    {isSearching && <div style={{textAlign: 'center', color: '#888', padding: 10}}>Поиск...</div>}
                    <div className="search-results"> 
                         {searchResults.length === 0 && searchQuery && !isSearching && <div style={{textAlign: 'center', color: '#666', padding: 10}}>Ничего не найдено</div>}
                        {searchResults.map((u, i) => ( <div key={i} className="search-item"> <div className="member-info"> <div className="friend-avatar" style={{ fontSize: 12 }}>{u.username[0]}</div> <span>{u.username}</span> </div> {!friends.includes(u.username) && <button className="add-btn-small" onClick={() => { socket.emit("send_friend_request", { fromUser: username, toUserSocketId: u.socketId }); alert('Sent!') }}>+</button>} </div> ))} 
                    </div> 
                </Modal> 
            )}
            
            {activeModal === 'settings' && (
                <Modal title="My Profile" onClose={() => setActiveModal(null)}>
                    <div className="profile-hero">
                        <div className="profile-avatar-large" style={getAvatarStyle(myProfile.avatar_url)}>{!myProfile.avatar_url && username[0].toUpperCase()}</div>
                        <div className="profile-name">{username}</div>
                        <div className="profile-status">online</div>
                        <button className="change-avatar-btn" onClick={() => avatarInputRef.current.click()}>Set Profile Photo</button>
                    </div>
                    <div className="settings-list">
                         <div className="settings-item" onClick={() => {}}>
                            <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="#ffffff" d="M1 2h8.58l1.487 6.69l-1.86 1.86a14.08 14.08 0 0 0 4.243 4.242l1.86-1.859L22 14.42V23h-1a19.91 19.91 0 0 1-10.85-3.196a20.101 20.101 0 0 1-5.954-5.954A19.91 19.91 0 0 1 1 3V2Zm2.027 2a17.893 17.893 0 0 0 2.849 8.764a18.102 18.102 0 0 0 5.36 5.36A17.892 17.892 0 0 0 20 20.973v-4.949l-4.053-.9l-2.174 2.175l-.663-.377a16.073 16.073 0 0 1-6.032-6.032l-.377-.663l2.175-2.174L7.976 4H3.027Z"/></svg></div>
                            <div className="form-container" style={{flex: 1, padding: 0, margin: 0}}>
                                 <div className="input-group">
                                    <label>Mobile</label>
                                    <input className="modal-input" style={{padding: '5px 0', borderBottom: 'none'}} value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Add phone number" />
                                 </div>
                            </div>
                        </div>
                        <div className="settings-item" onClick={() => {}}>
                            <div className="settings-icon"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="#ffffff" d="M21 1v22H3V1h18Zm-8 2v6.5l-3-2.25L7 9.5V3H5v18h14V3h-6ZM9 3v2.5l1-.75l1 .75V3H9Zm-2 9h10v2H7v-2Zm0 4h8v2H7v-2Z"/></svg></div>
                            <div className="form-container" style={{flex: 1, padding: 0, margin: 0}}>
                                 <div className="input-group">
                                    <label>Bio</label>
                                    <input className="modal-input" style={{padding: '5px 0', borderBottom: 'none'}} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Add a few words about yourself" />
                                 </div>
                            </div>
                        </div>
                         <div className="settings-item" onClick={() => {}}>
                             <div className="settings-icon">@</div>
                             <div className="settings-label">
                                <div style={{fontSize: '16px'}}>{username}</div>
                                <div style={{fontSize: '12px', color: '#888'}}>Username</div>
                             </div>
                        </div>
                    </div>

                    <div className="avatar-history" style={{padding: '0 20px'}}>
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
                    <div style={{padding: '0 20px 20px 20px'}}>
                        <button className="btn-primary" style={{width: '100%'}} onClick={saveProfile}>Save Changes</button>
                        <button className="btn-danger" style={{marginTop: 10, textAlign: 'center'}} onClick={handleLogout}>Log Out</button>
                    </div>
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

            {activeModal === 'groupInfo' && ( 
                <Modal title="Group Info" onClose={() => setActiveModal(null)}> 
                    <div className="profile-hero"> 
                        <div className="profile-avatar-large">{room.substring(0, 2)}</div> 
                        <div className="profile-name">{room}</div> 
                        <div className="profile-status">{groupMembers.length} members</div> 
                    </div> 
                    <div className="settings-list" style={{padding: '0 15px'}}>
                         <div style={{color: '#8774e1', padding: '10px 0', fontSize: '14px', fontWeight: 'bold'}}>Members</div>
                         {groupMembers.map((m, i) => ( 
                            <div key={i} className="settings-item"> 
                                <div className="friend-avatar" style={{ fontSize: 12, marginRight: 15 }}>{m.username[0]}</div> 
                                <div className="settings-label">
                                    <div style={{fontSize: '16px'}}>{m.username}</div>
                                    <div style={{fontSize: '12px', color: '#888'}}>
                                        {m.role === 'owner' ? 'owner' : 'member'}
                                    </div>
                                </div> 
                                {myRole === 'owner' && m.role !== 'owner' && m.username !== username && ( 
                                    <button style={{ color: '#ff5959', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => socket.emit("remove_group_member", { room, username: m.username })}>&times;</button> 
                                )} 
                            </div> 
                        ))} 
                    </div> 
                    <div style={{padding: '20px'}}>
                        <div className="action-card" onClick={() => { const n = prompt("Ник:"); if (n) socket.emit("add_group_member", { room, username: n }) }} style={{ marginBottom: 10 }}>
                            <span style={{fontSize: 20}}>➕</span>
                            <div>Add Member</div>
                        </div> 
                        <button className="btn-danger" style={{textAlign: 'center'}} onClick={leaveGroup}>{myRole === 'owner' ? 'Delete Group' : 'Leave Group'}</button> 
                    </div>
                </Modal> 
            )}
            
            {activeModal === 'userProfile' && viewProfileData && (
                <Modal title="Info" onClose={() => setActiveModal(null)}>
                    <div className="profile-hero">
                        <div className="profile-avatar-large" style={getAvatarStyle(viewProfileData.avatar_url)}>
                            {!viewProfileData.avatar_url && viewProfileData.username[0]?.toUpperCase()}
                        </div>
                        <div className="profile-name">{viewProfileData.username}</div>
                        <div className="profile-status">{viewProfileData.isFriend ? 'В контактах' : 'online'}</div>
                    </div>

                    <div className="settings-list">
                        {viewProfileData.bio && (
                            <div className="settings-item">
                                <div className="settings-label">
                                    <div style={{fontSize: '16px'}}>{viewProfileData.bio}</div>
                                    <div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>Bio</div>
                                </div>
                            </div>
                        )}
                        
                        {viewProfileData.phone && (
                            <div className="settings-item">
                                <div className="settings-label">
                                    <div style={{fontSize: '16px'}}>{viewProfileData.phone}</div>
                                    <div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>Mobile</div>
                                </div>
                            </div>
                        )}

                        <div className="settings-item">
                             <div className="settings-label">
                                <div style={{fontSize: '16px'}}>@{viewProfileData.username}</div>
                                <div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>Username</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="avatar-history" style={{padding: '0 15px'}}>
                        {avatarHistory.length > 0 && <h4>Old Avatars</h4>}
                        <div className="avatar-history-container">
                            {avatarHistory.map(avatar => (
                                <div key={avatar.id} className="avatar-history-item">
                                    <img src={avatar.avatar_url} alt="old avatar" onClick={() => setImageModalSrc(avatar.avatar_url)} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{marginTop: '10px', background: '#212121', padding: '0 15px'}}>
                        {viewProfileData.isFriend && (
                            <div className="settings-item" onClick={() => removeFriend(viewProfileData.username)} style={{color: '#ff5959'}}>
                               <span className="settings-icon" style={{color: '#ff5959'}}><svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24"><path fill="#ffffff" d="m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6L8.4 17ZM5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.588 1.413T19 21H5Zm0-2h14V5H5v14ZM5 5v14V5Z"/></svg></span>
                               Delete Contact
                            </div>
                        )}
                        <div className="settings-item" onClick={() => blockUser(viewProfileData.username)} style={{color: '#ff5959', border: 'none'}}>
                            <span className="settings-icon" style={{color: '#ff5959'}}><svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="#ffffff"><path fill="#ffffff" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-1.35-.438-2.6T18.3 7.1L7.1 18.3q1.05.825 2.3 1.263T12 20Zm-6.3-3.1L16.9 5.7q-1.05-.825-2.3-1.262T12 4Q8.65 4 6.325 6.325T4 12q0 1.35.437 2.6T5.7 16.9Z"/></svg></span>
                            Block User
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default Chat;