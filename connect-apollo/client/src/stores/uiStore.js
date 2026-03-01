import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Мобильный вид
  isMobile: window.innerWidth <= 768,
  showMobileChat: false,
  swipeX: 0,
  isSwiping: false,

  // Модальные окна и меню
  activeModal: null,
  contextMenu: null, 
  imageModalSrc: null,
  isEmojiPickerOpen: false,
  showMenu: false,

  // Режим выделения сообщений/чатов
  isSelectionMode: false,
  selectedChats: [],

  // Drag & Drop
  isDragOverlayOpen: false,
  dragFiles: [],
  isMobileDragging: false,
  draggedItemId: null,

  // Скролл в чате
  showScrollBottomBtn: false,
  unreadScrollCount: 0,

  // Уведомления внутри приложения
  inAppNotif: { visible: false, title: '', body: '', avatar: null, room: '' },

  setIsMobile: (isMobile) => set({ isMobile }),
  setShowMobileChat: (showMobileChat) => set({ showMobileChat }),
  setSwipeX: (swipeX) => set({ swipeX }),
  setIsSwiping: (isSwiping) => set({ isSwiping }),

  setActiveModal: (activeModal) => set({ activeModal }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setImageModalSrc: (imageModalSrc) => set({ imageModalSrc }),
  setIsEmojiPickerOpen: (isEmojiPickerOpen) => set({ isEmojiPickerOpen }),
  setShowMenu: (showMenu) => set({ showMenu }),

  setIsSelectionMode: (isSelectionMode) => set({ isSelectionMode }),
  setSelectedChats: (selectedChats) => set({ selectedChats }),
  toggleChatSelection: (chatId) => {
    const { selectedChats } = get();
    if (selectedChats.includes(chatId)) {
      const newSelection = selectedChats.filter(id => id !== chatId);
      set({ selectedChats: newSelection, isSelectionMode: newSelection.length > 0 });
    } else {
      set({ selectedChats: [...selectedChats, chatId] });
    }
  },
  clearSelection: () => set({ isSelectionMode: false, selectedChats: [] }),

  setIsDragOverlayOpen: (isDragOverlayOpen) => set({ isDragOverlayOpen }),
  setDragFiles: (dragFiles) => set({ dragFiles }),
  setIsMobileDragging: (isMobileDragging) => set({ isMobileDragging }),
  setDraggedItemId: (draggedItemId) => set({ draggedItemId }),

  setShowScrollBottomBtn: (showScrollBottomBtn) => set({ showScrollBottomBtn }),
  setUnreadScrollCount: (unreadScrollCount) => set({ unreadScrollCount }),
  
  triggerInAppNotif: (title, body, avatar, room) => {
    set({ inAppNotif: { visible: true, title, body, avatar, room } });
    setTimeout(() => {
      set((state) => ({ inAppNotif: { ...state.inAppNotif, visible: false } }));
    }, 3500);
  },
  hideInAppNotif: () => set((state) => ({ inAppNotif: { ...state.inAppNotif, visible: false } }))
}));