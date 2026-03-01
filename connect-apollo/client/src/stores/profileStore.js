import { create } from 'zustand';

export const useProfileStore = create((set, get) => ({
  // Мой профиль
  myProfile: JSON.parse(localStorage.getItem("apollo_my_profile")) || { bio: "", phone: "", avatar_url: "", display_name: "", notifications_enabled: 1, media: [] },
  setMyProfile: (updater) => {
    const nextProfile = typeof updater === 'function' ? updater(get().myProfile) : updater;
    localStorage.setItem("apollo_my_profile", JSON.stringify(nextProfile));
    set({ myProfile: nextProfile });
  },

  profileForm: { bio: "", phone: "", display_name: "", username: "", notifications_enabled: 1 },
  setProfileForm: (updater) => set((state) => ({ 
    profileForm: typeof updater === 'function' ? updater(state.profileForm) : updater 
  })),

  // Друзья и чаты 
  friends: JSON.parse(localStorage.getItem("apollo_friends")) || [],
  setFriends: (updater) => {
    const nextFriends = typeof updater === 'function' ? updater(get().friends) : updater;
    localStorage.setItem("apollo_friends", JSON.stringify(nextFriends));
    set({ friends: nextFriends });
  },

  myChats: JSON.parse(localStorage.getItem("apollo_my_chats")) || [],
  setMyChats: (updater) => {
    const nextChats = typeof updater === 'function' ? updater(get().myChats) : updater;
    localStorage.setItem("apollo_my_chats", JSON.stringify(nextChats));
    set({ myChats: nextChats });
  },

  // Чужой профиль
  viewProfileData: null,
  setViewProfileData: (viewProfileData) => set({ viewProfileData }),

  friendOverrideForm: { local_display_name: '', local_avatar_file: null, preview_avatar: '' },
  setFriendOverrideForm: (updater) => set((state) => ({ 
    friendOverrideForm: typeof updater === 'function' ? updater(state.friendOverrideForm) : updater 
  })),

  // Аватарки и медиа
  avatarHistory: [],
  setAvatarHistory: (avatarHistory) => set({ avatarHistory }),

  avatarEditor: { isOpen: false, image: null, crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0 } },
  setAvatarEditor: (updater) => set((state) => ({ 
    avatarEditor: typeof updater === 'function' ? updater(state.avatarEditor) : updater 
  })),

  isMediaExpanded: false,
  setIsMediaExpanded: (isMediaExpanded) => set({ isMediaExpanded }),

  // Поиск
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  isSearching: false,
  setIsSearching: (isSearching) => set({ isSearching }),
  
  searchResults: [],
  setSearchResults: (searchResults) => set({ searchResults }),
  
  searchGroupResults: [],
  setSearchGroupResults: (searchGroupResults) => set({ searchGroupResults }),
}));