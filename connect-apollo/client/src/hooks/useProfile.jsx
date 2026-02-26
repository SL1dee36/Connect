import { useState, useRef, useCallback, useEffect } from 'react';

export const useProfile = (socket, username, socketActions) => {
  const [myProfile, setMyProfile] = useState({
    bio: "",
    phone: "",
    avatar_url: "",
    display_name: "",
    notifications_enabled: 1,
    media: []
  });
  const [viewProfileData, setViewProfileData] = useState(null);
  const [avatarHistory, setAvatarHistory] = useState([]);
  const [profileForm, setProfileForm] = useState({
    bio: "",
    phone: "",
    display_name: "",
    username: "",
    notifications_enabled: 1
  });
  const [avatarEditor, setAvatarEditor] = useState({
    isOpen: false,
    image: null,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
    filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 }
  });
  const [friendOverrideForm, setFriendOverrideForm] = useState({
    local_display_name: '',
    local_avatar_file: null,
    preview_avatar: ''
  });
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);

  const profileMediaInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const friendAvatarInputRef = useRef(null);
  const myProfileRef = useRef(myProfile);

  useEffect(() => {
    myProfileRef.current = myProfile;
  }, [myProfile]);

  // Загрузка профиля при изменении username
  useEffect(() => {
    if (username && socket) {
      socketActions.getMyProfile(username);
      socketActions.getAvatarHistory(username);
    }
  }, [username, socket, socketActions]);

  const createImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });
  }, []);

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
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/webp', 0.8);
    });
  }, [createImage]);

  const getAvatarStyle = useCallback((imgUrl) => {
    return imgUrl
      ? {
          backgroundImage: `url(${imgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#333',
          color: 'transparent'
        }
      : { backgroundColor: '#333' };
  }, []);

  const onFileChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setAvatarEditor(prev => ({ ...prev, image: reader.result, isOpen: true }));
      }, false);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSaveAvatar = useCallback(async (BACKEND_URL) => {
    if (!avatarEditor.croppedAreaPixels) return;
    const croppedImageBlob = await getCroppedImg(avatarEditor.image, avatarEditor.croppedAreaPixels, avatarEditor.filters);
    const formData = new FormData();
    formData.append('avatar', croppedImageBlob, 'avatar.webp');
    formData.append('username', username);

    try {
      const res = await fetch(`${BACKEND_URL}/upload-avatar`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.profile) {
        setMyProfile(prev => ({ ...prev, ...data.profile }));
        socketActions.getAvatarHistory(username);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAvatarEditor({
        isOpen: false,
        image: null,
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
        filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 }
      });
    }
  }, [avatarEditor, username, socketActions, getCroppedImg]);

  const handleProfileMediaSelect = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadProfileMedia(e.target.files[0]);
    }
  }, []);

  const uploadProfileMedia = useCallback(async (file, BACKEND_URL) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);
    const localUrl = URL.createObjectURL(file);
    const tempMediaItem = {
      id: Date.now(),
      url: localUrl,
      type: file.type.startsWith('video') ? 'video' : 'image',
      temp: true
    };

    setMyProfile(prev => ({
      ...prev,
      media: [...(prev.media || []), tempMediaItem]
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/upload-profile-media`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setMyProfile(prev => ({
          ...prev,
          media: prev.media.map(m => m.id === tempMediaItem.id ? { ...m, url: data.url, temp: false } : m)
        }));
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка загрузки медиа");
      setMyProfile(prev => ({ ...prev, media: prev.media.filter(m => m.id !== tempMediaItem.id) }));
    }
  }, [username]);

  const openSettings = useCallback(() => {
    socketActions.getMyProfile(username);
    socketActions.getAvatarHistory(username);
    setProfileForm({
      bio: myProfile.bio || "",
      phone: myProfile.phone || "",
      display_name: myProfile.display_name || username,
      username: username,
      notifications_enabled: myProfile.notifications_enabled
    });
  }, [username, myProfile, socketActions]);

  const saveProfile = useCallback(() => {
    if (profileForm.username !== username) {
      const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
      if (!usernameRegex.test(profileForm.username)) {
        alert("Nametag должен содержать только латинские буквы и цифры, минимум 3 символа.");
        return;
      }
    }
    socketActions.updateProfile({
      username,
      bio: profileForm.bio,
      phone: profileForm.phone,
      display_name: profileForm.display_name,
      notifications_enabled: profileForm.notifications_enabled,
      newUsername: profileForm.username
    });
  }, [username, profileForm, socketActions]);

  const handleSaveFriendOverride = useCallback(async (isReset = false, BACKEND_URL) => {
    if (!viewProfileData) return;
    const formData = new FormData();
    formData.append('friend_username', viewProfileData.username);
    if (isReset) {
      formData.append('reset', 'true');
    } else {
      formData.append('local_display_name', friendOverrideForm.local_display_name);
      if (friendOverrideForm.local_avatar_file) {
        formData.append('local_avatar', friendOverrideForm.local_avatar_file);
      } else {
        formData.append('local_avatar_url', friendOverrideForm.preview_avatar);
      }
    }

    try {
      const token = localStorage.getItem("apollo_token");
      const res = await fetch(`${BACKEND_URL}/update-friend-override`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        socketActions.emitEvent("get_initial_data");
        socketActions.getUserProfile(viewProfileData.username);
      } else {
        alert("Ошибка сохранения");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка");
    }
  }, [viewProfileData, friendOverrideForm, socketActions]);

  const copyProfileLink = useCallback((targetUsername) => {
    const link = `${window.location.origin}?user=${targetUsername}`;
    navigator.clipboard.writeText(link);
    alert("Ссылка на профиль скопирована!");
  }, []);

  const removeFriend = useCallback((t, setActiveModal) => {
    if (window.confirm(`Удалить ${t}?`)) {
      socketActions.removeFriend(t);
      setActiveModal(null);
    }
  }, [socketActions]);

  const blockUser = useCallback((t, setActiveModal) => {
    if (window.confirm(`Заблокировать ${t}?`)) {
      socketActions.blockUser(t);
      setActiveModal(null);
    }
  }, [socketActions]);

  const leaveGroup = useCallback((room) => {
    if (window.confirm("Выйти из группы?")) {
      socketActions.leaveRoom({ room });
    }
  }, [socketActions]);

  return {
    // State
    myProfile,
    setMyProfile,
    viewProfileData,
    setViewProfileData,
    avatarHistory,
    setAvatarHistory,
    profileForm,
    setProfileForm,
    avatarEditor,
    setAvatarEditor,
    friendOverrideForm,
    setFriendOverrideForm,
    isMediaExpanded,
    setIsMediaExpanded,

    // Refs
    profileMediaInputRef,
    avatarInputRef,
    friendAvatarInputRef,
    myProfileRef,

    // Actions
    createImage,
    getCroppedImg,
    getAvatarStyle,
    onFileChange,
    handleSaveAvatar,
    handleProfileMediaSelect,
    uploadProfileMedia,
    openSettings,
    saveProfile,
    handleSaveFriendOverride,
    copyProfileLink,
    removeFriend,
    blockUser,
    leaveGroup
  };
};