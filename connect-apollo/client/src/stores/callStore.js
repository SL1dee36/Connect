import { create } from 'zustand';

export const useCallStore = create((set, get) => ({
  callStatus: 'idle', // 'idle' | 'calling' | 'receiving' | 'connected'
  callSignal: null,
  caller: "",
  callerName: "",
  
  isMuted: false,
  isVideoOff: false,

  localStream: null,
  remoteStream: null,
  peerConnection: null,

  setCallStatus: (callStatus) => set({ callStatus }),
  setCallSignal: (callSignal) => set({ callSignal }),
  setCaller: (caller) => set({ caller }),
  setCallerName: (callerName) => set({ callerName }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setIsVideoOff: (isVideoOff) => set({ isVideoOff }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setPeerConnection: (peerConnection) => set({ peerConnection }),

  clearCall: () => {
    const { localStream, peerConnection } = get();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (peerConnection) peerConnection.close();

    set({
      callStatus: 'idle',
      callSignal: null,
      caller: "",
      callerName: "",
      isMuted: false,
      isVideoOff: false,
      localStream: null,
      remoteStream: null,
      peerConnection: null
    });
  }
}));