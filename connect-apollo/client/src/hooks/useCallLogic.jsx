import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useProfileStore } from '../stores/profileStore';
import { useCallStore } from '../stores/callStore';

const servers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export const useCallLogic = () => {
  const endCallProcess = useCallback(() => {
    useCallStore.getState().clearCall();
  }, []);

  const startCall = useCallback(async (isVideo = true, overrideRoom = null) => {
    const { socket, username } = useAuthStore.getState();
    const room = overrideRoom || useChatStore.getState().room;
    const myProfile = useProfileStore.getState().myProfile;
    const call = useCallStore.getState();

    if (!room.includes("_")) return alert("Звонки доступны только в личных сообщениях");
    
    const parts = room.split("_"); 
    const userToCall = parts.find(u => u !== username); 
    if(!userToCall) return;

    call.setCallStatus('calling'); 
    call.setCallerName(userToCall);
    
    const localStream = new MediaStream(); 
    const peer = new RTCPeerConnection(servers); 
    
    call.setPeerConnection(peer);

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
    } catch (err) { alert("Микрофон недоступен. Вы будете только слышать собеседника."); }

    if (isVideo) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
      } catch (err) { alert("Камера недоступна. Звонок продолжится без видео."); }
    }

    call.setLocalStream(localStream);

    try {
      peer.onicecandidate = (event) => { 
        if (event.candidate) socket.emit("ice-candidate", { to: userToCall, candidate: event.candidate }); 
      };
      
      peer.ontrack = (event) => { 
        useCallStore.getState().setRemoteStream(event.streams[0]); 
      };

      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peer.setLocalDescription(offer);
      
      socket.emit("callUser", { 
        userToCall, 
        signalData: offer, 
        from: username, 
        name: myProfile.display_name || username 
      });
    } catch (err) { 
      alert("Ошибка соединения."); 
      endCallProcess(); 
    }
  }, [endCallProcess]);

  const answerCall = useCallback(async () => {
    const { socket } = useAuthStore.getState();
    const call = useCallStore.getState();

    call.setCallStatus('connected');
    const localStream = new MediaStream(); 
    const peer = new RTCPeerConnection(servers); 
    
    call.setPeerConnection(peer);

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
    } catch (err) { console.log("Audio denied", err); }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoStream.getTracks().forEach(track => { localStream.addTrack(track); peer.addTrack(track, localStream); });
    } catch (err) { console.log("Video denied", err); }

    call.setLocalStream(localStream);

    try {
      peer.ontrack = (event) => { 
        useCallStore.getState().setRemoteStream(event.streams[0]); 
      };
      peer.onicecandidate = (event) => { 
        if (event.candidate) socket.emit("ice-candidate", { to: call.caller, candidate: event.candidate }); 
      };

      await peer.setRemoteDescription(new RTCSessionDescription(call.callSignal));
      const answer = await peer.createAnswer(); 
      await peer.setLocalDescription(answer);
      
      socket.emit("answerCall", { signal: answer, to: call.caller });
    } catch (err) { 
      endCallProcess(); 
    }
  }, [endCallProcess]);

  const endCall = useCallback(() => {
    const { socket } = useAuthStore.getState();
    const { callStatus, caller, callerName } = useCallStore.getState();
    
    const target = callStatus === 'receiving' ? caller : callerName;
    if (socket) socket.emit("endCall", { to: target }); 
    endCallProcess();
  }, [endCallProcess]);

  const toggleMute = useCallback(() => {
    const { localStream, isMuted, setIsMuted } = useCallStore.getState();
    if(localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) { 
          audioTracks[0].enabled = !audioTracks[0].enabled; 
          setIsMuted(!audioTracks[0].enabled); 
        }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const { localStream, isVideoOff, setIsVideoOff } = useCallStore.getState();
    if(localStream) {
         const videoTracks = localStream.getVideoTracks();
         if (videoTracks.length > 0) { 
           videoTracks[0].enabled = !videoTracks[0].enabled; 
           setIsVideoOff(!videoTracks[0].enabled); 
         }
    }
  }, []);

  return {
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};