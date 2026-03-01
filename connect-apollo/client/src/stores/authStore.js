import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
  
  username: null,
  setUsername: (username) => set({ username }),
  
  handleLogout: () => {
    localStorage.removeItem("apollo_token");
    set({ username: null, socket: null });
    window.location.reload();
  }
}));