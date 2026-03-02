import { create } from 'zustand';
import { get, set as idbSet } from 'idb-keyval';

export const useChatStore = create((set, get) => ({
  // Активный чат (комната)
  room: localStorage.getItem("apollo_room") || "",
  setRoom: (room) => {
    localStorage.setItem("apollo_room", room);
    set({ room, messageList: [] });
    get().loadCachedMessages(room);
  },

  roomSettings: { is_private: 0, slow_mode: 0, avatar_url: '' },
  setRoomSettings: (settings) => set((state) => ({
    roomSettings: typeof settings === 'function' ? settings(state.roomSettings) : settings
  })),

  groupMembers: [],
  setGroupMembers: (groupMembers) => set({ groupMembers }),

  myRole: "member",
  setMyRole: (myRole) => set({ myRole }),

  globalRole: "member",
  setGlobalRole: (globalRole) => set({ globalRole }),

  typingText: "",
  setTypingText: (typingText) => set({ typingText }),

  // Превью чатов в боковом меню
  chatPreviews: JSON.parse(localStorage.getItem("apollo_chat_previews")) || {},
  setChatPreviews: (previews) => {
    const nextPreviews = typeof previews === 'function' ? previews(get().chatPreviews) : previews;
    localStorage.setItem("apollo_chat_previews", JSON.stringify(nextPreviews));
    set({ chatPreviews: nextPreviews });
  },

  // Сообщения
  messageList: [],
  setMessageList: (updater) => set((state) => {
    const newList = typeof updater === 'function' ? updater(state.messageList) : updater;

    if (state.room) {
      const key = `chat_history_${state.room}`;
      idbSet(key, newList.slice(-100))
        .then(() => {
        })
        .catch(err => {
          console.warn('Ошибка сохранения в IndexedDB:', err);
        });
    }

    return { messageList: newList };
  }),

  loadCachedMessages: async (roomName) => {
    try {
      const cached = await get(`chat_history_${roomName}`);
      if (cached && cached.length > 0) {
        set({ messageList: cached });
      }
    } catch (e) {
      console.error("Ошибка загрузки кэша:", e);
    }
  },


  hasMore: true,
  setHasMore: (hasMore) => set({ hasMore }),

  isLoadingHistory: false,
  setIsLoadingHistory: (isLoadingHistory) => set({ isLoadingHistory }),

  messageToDelete: null,
  setMessageToDelete: (messageToDelete) => set({ messageToDelete }),

  editingMessage: null,
  setEditingMessage: (editingMessage) => set({ editingMessage }),

  // Ввод сообщения и запись (ввод)
  currentMessage: "",
  setCurrentMessage: (currentMessage) => set({ currentMessage }),

  attachedFiles: [],
  setAttachedFiles: (updater) => set((state) => ({
    attachedFiles: typeof updater === 'function' ? updater(state.attachedFiles) : updater
  })),

  replyingTo: null,
  setReplyingTo: (replyingTo) => set({ replyingTo }),

  isUploading: false,
  setIsUploading: (isUploading) => set({ isUploading }),

  inputMode: 'audio', // 'audio' | 'video'
  setInputMode: (updater) => set((state) => ({
    inputMode: typeof updater === 'function' ? updater(state.inputMode) : updater
  })),

  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),

  isLocked: false,
  setIsLocked: (isLocked) => set({ isLocked }),

  recordingTime: 0,
  setRecordingTime: (recordingTime) => set({ recordingTime }),

  recordedMedia: null,
  setRecordedMedia: (recordedMedia) => set({ recordedMedia }),

  videoShape: 'circle',
  setVideoShape: (videoShape) => set({ videoShape }),

  activeVideoState: null,
  setActiveVideoState: (activeVideoState) => set({ activeVideoState }),

  // Звонки 
  callStatus: 'idle', // 'idle' | 'calling' | 'receiving' | 'connected'
  setCallStatus: (callStatus) => set({ callStatus }),
  
  callSignal: null,
  setCallSignal: (callSignal) => set({ callSignal }),

  caller: "",
  setCaller: (caller) => set({ caller }),

  callerName: "",
  setCallerName: (callerName) => set({ callerName }),

  isMuted: false,
  setIsMuted: (isMuted) => set({ isMuted }),

  isVideoOff: false,
  setIsVideoOff: (isVideoOff) => set({ isVideoOff }),
}));