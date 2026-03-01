import { create } from 'zustand';

export const useSettingsStore = create((set, get) => ({
  // Папки
  folders: JSON.parse(localStorage.getItem("apollo_folders")) || [{id: 'all', name: 'All', chatIds: []}],
  setFolders: (updater) => {
    const nextFolders = typeof updater === 'function' ? updater(get().folders) : updater;
    localStorage.setItem("apollo_folders", JSON.stringify(nextFolders));
    set({ folders: nextFolders });
  },

  activeFolderId: 'all',
  setActiveFolderId: (activeFolderId) => set({ activeFolderId }),

  folderToEdit: null,
  setFolderToEdit: (folderToEdit) => set({ folderToEdit }),

  newFolderName: "",
  setNewFolderName: (newFolderName) => set({ newFolderName }),

  // Сортировка и закрепление
  pinnedChats: JSON.parse(localStorage.getItem("apollo_pinned_chats")) || [],
  setPinnedChats: (updater) => {
    const nextPinned = typeof updater === 'function' ? updater(get().pinnedChats) : updater;
    localStorage.setItem("apollo_pinned_chats", JSON.stringify(nextPinned));
    set({ pinnedChats: nextPinned });
  },

  customChatOrder: JSON.parse(localStorage.getItem("apollo_chat_order")) || [],
  setCustomChatOrder: (updater) => {
    const nextOrder = typeof updater === 'function' ? updater(get().customChatOrder) : updater;
    localStorage.setItem("apollo_chat_order", JSON.stringify(nextOrder));
    set({ customChatOrder: nextOrder });
  },

  // Уведомления
  notifications: [],
  setNotifications: (updater) => set((state) => ({ 
    notifications: typeof updater === 'function' ? updater(state.notifications) : updater 
  })),
  
  hasUnreadNotifs: false,
  setHasUnreadNotifs: (hasUnreadNotifs) => set({ hasUnreadNotifs }),

  // Баги и админка
  bugDescription: "",
  setBugDescription: (bugDescription) => set({ bugDescription }),
  
  bugFiles: [],
  setBugFiles: (bugFiles) => set({ bugFiles }),
  
  adminBugList: [],
  setAdminBugList: (adminBugList) => set({ adminBugList }),

  // Общее
  totalNetworkUsers: 0,
  setTotalNetworkUsers: (totalNetworkUsers) => set({ totalNetworkUsers }),
}));