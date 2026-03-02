import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Папки
      folders: [{ id: 'all', name: 'All', chatIds: [] }],
      setFolders: (updater) =>
        set((state) => ({
          folders: typeof updater === 'function' ? updater(state.folders) : updater,
        })),

      activeFolderId: 'all',
      setActiveFolderId: (activeFolderId) => set({ activeFolderId }),

      folderToEdit: null,
      setFolderToEdit: (folderToEdit) => set({ folderToEdit }),

      newFolderName: '',
      setNewFolderName: (newFolderName) => set({ newFolderName }),

      // Сортировка и закрепление
      pinnedChats: [],
      setPinnedChats: (updater) =>
        set((state) => ({
          pinnedChats: typeof updater === 'function' ? updater(state.pinnedChats) : updater,
        })),

      customChatOrder: [],
      setCustomChatOrder: (updater) =>
        set((state) => ({
          customChatOrder: typeof updater === 'function' ? updater(state.customChatOrder) : updater,
        })),

      // Уведомления
      notifications: [],
      setNotifications: (updater) =>
        set((state) => ({
          notifications: typeof updater === 'function' ? updater(state.notifications) : updater,
        })),

      hasUnreadNotifs: false,
      setHasUnreadNotifs: (hasUnreadNotifs) => set({ hasUnreadNotifs }),

      // Баги и админка
      bugDescription: '',
      setBugDescription: (bugDescription) => set({ bugDescription }),

      bugFiles: [],
      setBugFiles: (bugFiles) => set({ bugFiles }),

      adminBugList: [],
      setAdminBugList: (adminBugList) => set({ adminBugList }),

      // Общее
      totalNetworkUsers: 0,
      setTotalNetworkUsers: (totalNetworkUsers) => set({ totalNetworkUsers }),
    }),

    {
      name: 'apollo-settings-storage',

      partialize: (state) => ({
        folders: state.folders,
        pinnedChats: state.pinnedChats,
        customChatOrder: state.customChatOrder,
      }),
    }
  )
);