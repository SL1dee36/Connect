import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProfileStore = create(
  persist(
    (set, get) => ({
      // Мой профиль
      myProfile: {
        bio: '',
        phone: '',
        avatar_url: '',
        display_name: '',
        notifications_enabled: 1,
        media: [],
      },
      setMyProfile: (updater) =>
        set((state) => ({
          myProfile: typeof updater === 'function' ? updater(state.myProfile) : updater,
        })),

      profileForm: {
        bio: '',
        phone: '',
        display_name: '',
        username: '',
        notifications_enabled: 1,
      },
      setProfileForm: (updater) =>
        set((state) => ({
          profileForm: typeof updater === 'function' ? updater(state.profileForm) : updater,
        })),

      // Друзья и чаты
      friends: [],
      setFriends: (updater) =>
        set((state) => ({
          friends: typeof updater === 'function' ? updater(state.friends) : updater,
        })),

      myChats: [],
      setMyChats: (updater) =>
        set((state) => ({
          myChats: typeof updater === 'function' ? updater(state.myChats) : updater,
        })),

      // Чужой профиль / просмотр
      viewProfileData: null,
      setViewProfileData: (viewProfileData) => set({ viewProfileData }),

      friendOverrideForm: {
        local_display_name: '',
        local_avatar_file: null,
        preview_avatar: '',
      },
      setFriendOverrideForm: (updater) =>
        set((state) => ({
          friendOverrideForm: typeof updater === 'function' ? updater(state.friendOverrideForm) : updater,
        })),

      // Аватарки и медиа
      avatarHistory: [],
      setAvatarHistory: (avatarHistory) => set({ avatarHistory }),

      avatarEditor: {
        isOpen: false,
        image: null,
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
        filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 },
      },
      setAvatarEditor: (updater) =>
        set((state) => ({
          avatarEditor: typeof updater === 'function' ? updater(state.avatarEditor) : updater,
        })),

      isMediaExpanded: false,
      setIsMediaExpanded: (isMediaExpanded) => set({ isMediaExpanded }),

      // Поиск
      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      isSearching: false,
      setIsSearching: (isSearching) => set({ isSearching }),

      searchResults: [],
      setSearchResults: (searchResults) => set({ searchResults }),

      searchGroupResults: [],
      setSearchGroupResults: (searchGroupResults) => set({ searchGroupResults }),
    }),

    {
      name: 'apollo-profile-storage',

      partialize: (state) => ({
        myProfile: state.myProfile,
        friends: state.friends,
        myChats: state.myChats,
        avatarHistory: state.avatarHistory,
      }),

    }
  )
);