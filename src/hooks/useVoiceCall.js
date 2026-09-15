import { useEffect, useRef, useState } from "react";
import socket from "../socket";

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
  ],
};

function useVoiceCall(currentUser, selectedUser) {
  const [callState, setCallState] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const [muted, setMuted] = useState(false);

  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudio = useRef(null);

  const pendingOffer = useRef(null);
  const pendingCandidates = useRef([]);

  const activeRemoteUserId = useRef(null);

  // ==========================================
  // RINGTONE
  // ==========================================

  const ringtone = useRef(null);
  const audioUnlocked = useRef(false);

  useEffect(() => {
    const audio = new Audio("/sounds/ringtone.mp3");

    audio.loop = true;
    audio.volume = 0.8;
    audio.preload = "auto";

    ringtone.current = audio;

    // Unlock audio after user interaction.
    const unlockAudio = async () => {
      if (audioUnlocked.current) return;

      try {
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;

        audioUnlocked.current = true;

        console.log("Ringtone audio unlocked");
      } catch (error) {
        console.log("Audio unlock waiting:", error);
      }

      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);

      audio.pause();
      audio.src = "";
      ringtone.current = null;
    };
  }, []);

  const startRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.currentTime = 0;

    ringtone.current
      .play()
      .then(() => {
        console.log("Ringtone playing");
      })
      .catch((error) => {
        console.error("Ringtone blocked:", error);
      });
  };

  const stopRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.pause();
    ringtone.current.currentTime = 0;
  };

  // ==========================================
  // CLEANUP
  // ==========================================

  const cleanupCall = () => {
    console.log("Cleaning up voice call");

    stopRingtone();

    // Stop microphone
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStream.current = null;
    }

    // Close WebRTC
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.oniceconnectionstatechange = null;

      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Remove remote audio
    if (remoteAudio.current) {
      remoteAudio.current.pause();
      remoteAudio.current.srcObject = null;
    }

    pendingOffer.current = null;
    pendingCandidates.current = [];

    activeRemoteUserId.current = null;

    setIncomingCall(null);
    setCallState("idle");
    setMuted(false);
  };

  // ==========================================
  // CREATE PEER CONNECTION
  // ==========================================

  const createPeerConnection = (receiverId) => {
    console.log("Creating voice peer connection:", receiverId);

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (event) => {
      console.log("VOICE REMOTE TRACK RECEIVED");

      let stream = event.streams?.[0];

      if (!stream) {
        stream = new MediaStream();
        stream.addTrack(event.track);
      }

      if (!remoteAudio.current) {
        console.error("Remote audio element not available");
        return;
      }

      remoteAudio.current.srcObject = stream;
      remoteAudio.current.autoplay = true;
      remoteAudio.current.muted = false;
      remoteAudio.current.volume = 1;

      remoteAudio.current
        .play()
        .then(() => {
          console.log("REMOTE VOICE AUDIO PLAYING");
        })
        .catch((error) => {
          console.error("Remote audio play error:", error);
        });
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;

      socket.emit("webrtc_ice_candidate", {
        receiverId,
        candidate: event.candidate,
        callType: "voice",
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(
        "Voice connection state:",
        pc.connectionState
      );

      if (pc.connectionState === "connected") {
        setCallState("connected");
      }

      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        cleanupCall();
      }
    };

    peerConnection.current = pc;

    return pc;
  };

  // ==========================================
  // SOCKET LISTENERS
  // ==========================================

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit("join", currentUser.id);

    const handleIncomingCall = (data) => {
      if (data.callType !== "voice") return;

      console.log("INCOMING VOICE CALL:", data);

      activeRemoteUserId.current = data.callerId;

      setIncomingCall(data);
      setCallState("incoming");

      startRingtone();
    };

    const handleOffer = (data) => {
      if (data.callType !== "voice") return;

      console.log("VOICE OFFER RECEIVED");

      pendingOffer.current = data.offer;

      if (data.callerId) {
        activeRemoteUserId.current = data.callerId;
      }
    };

    const handleAnswer = async (data) => {
      if (data.callType !== "voice") return;

      if (!peerConnection.current) {
        console.error("Voice peer connection missing");
        return;
      }

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );

        await flushPendingCandidates();

        setCallState("connected");
      } catch (error) {
        console.error("Voice answer error:", error);
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.callType !== "voice") return;

      if (
        !peerConnection.current ||
        !peerConnection.current.remoteDescription
      ) {
        pendingCandidates.current.push(data.candidate);
        return;
      }

      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      } catch (error) {
        console.error("Voice ICE error:", error);
      }
    };

    const handleCallEnded = (data) => {
      if (data?.callType && data.callType !== "voice") {
        return;
      }

      console.log("VOICE CALL ENDED BY OTHER USER");

      cleanupCall();
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("webrtc_offer", handleOffer);
    socket.on("webrtc_answer", handleAnswer);
    socket.on("webrtc_ice_candidate", handleIceCandidate);
    socket.on("call_ended", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("webrtc_offer", handleOffer);
      socket.off("webrtc_answer", handleAnswer);
      socket.off(
        "webrtc_ice_candidate",
        handleIceCandidate
      );
      socket.off("call_ended", handleCallEnded);
    };
  }, [currentUser?.id]);

  // ==========================================
  // FLUSH ICE
  // ==========================================

  const flushPendingCandidates = async () => {
    if (!peerConnection.current) return;

    if (!peerConnection.current.remoteDescription) {
      return;
    }

    const candidates = [...pendingCandidates.current];

    pendingCandidates.current = [];

    for (const candidate of candidates) {
      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error("Pending voice ICE error:", error);
      }
    }
  };

  // ==========================================
  // START CALL
  // ==========================================

  const startCall = async () => {
    if (!currentUser || !selectedUser) return;

    try {
      console.log("STARTING VOICE CALL");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

      localStream.current = stream;

      activeRemoteUserId.current = selectedUser.id;

      const pc = createPeerConnection(selectedUser.id);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      socket.emit("call_user", {
        callerId: currentUser.id,
        receiverId: selectedUser.id,
        callerName: currentUser.name,
        callType: "voice",
      });

      socket.emit("webrtc_offer", {
        receiverId: selectedUser.id,
        offer,
        callType: "voice",
        callerId: currentUser.id,
      });

      setCallState("calling");

      console.log("VOICE OFFER SENT");
    } catch (error) {
      console.error("Voice start error:", error);

      alert(
        "Microphone permission is required for voice calls."
      );

      cleanupCall();
    }
  };

  // ==========================================
  // ACCEPT
  // ==========================================

  const acceptCall = async () => {
    if (!incomingCall) return;

    if (!pendingOffer.current) {
      console.error("No voice offer available");

      return;
    }

    try {
      stopRingtone();

      activeRemoteUserId.current =
        incomingCall.callerId;

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

      localStream.current = stream;

      const pc = createPeerConnection(
        incomingCall.callerId
      );

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(
        new RTCSessionDescription(
          pendingOffer.current
        )
      );

      await flushPendingCandidates();

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      socket.emit("webrtc_answer", {
        receiverId: incomingCall.callerId,
        answer,
        callType: "voice",
      });

      pendingOffer.current = null;

      setIncomingCall(null);
      setCallState("connected");

      console.log("VOICE CALL ACCEPTED");
    } catch (error) {
      console.error("Voice accept error:", error);

      cleanupCall();
    }
  };

  // ==========================================
  // REJECT
  // ==========================================

  const rejectCall = () => {
    if (!incomingCall) return;

    socket.emit("end_call", {
      receiverId: incomingCall.callerId,
      callType: "voice",
    });

    cleanupCall();
  };

  // ==========================================
  // MUTE
  // ==========================================

  const toggleMute = () => {
    if (!localStream.current) return;

    const audioTracks =
      localStream.current.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMuted((previous) => !previous);
  };

  // ==========================================
  // END CALL
  // ==========================================

  const endCall = () => {
    const receiverId =
      activeRemoteUserId.current ||
      incomingCall?.callerId ||
      selectedUser?.id;

    if (receiverId) {
      socket.emit("end_call", {
        receiverId,
        callType: "voice",
      });
    }

    cleanupCall();
  };

  return {
    callState,
    incomingCall,
    muted,
    remoteAudio,
    startCall,
    acceptCall,
    rejectCall,
    toggleMute,
    endCall,
  };
}

export default useVoiceCall;