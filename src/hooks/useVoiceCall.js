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

  const ringtone = useRef(null);

  // -----------------------------
  // RINGTONE
  // -----------------------------

  useEffect(() => {
    ringtone.current = new Audio("/sounds/ringtone.mp3");
    ringtone.current.loop = true;
    ringtone.current.volume = 0.8;

    return () => {
      stopRingtone();
    };
  }, []);

  const startRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.currentTime = 0;

    ringtone.current
      .play()
      .catch((error) => {
        console.log("Ringtone blocked:", error);
      });
  };

  const stopRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.pause();
    ringtone.current.currentTime = 0;
  };

  // -----------------------------
  // CLEANUP
  // -----------------------------

  const cleanupCall = () => {
    stopRingtone();

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange = null;

      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (remoteAudio.current) {
      remoteAudio.current.pause();
      remoteAudio.current.srcObject = null;
    }

    pendingOffer.current = null;
    pendingCandidates.current = [];

    setIncomingCall(null);
    setCallState("idle");
    setMuted(false);
  };

  // -----------------------------
  // ICE
  // -----------------------------

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
        console.error("Pending ICE error:", error);
      }
    }
  };

  // -----------------------------
  // CREATE PEER CONNECTION
  // -----------------------------

  const createPeerConnection = (receiverId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // IMPORTANT:
    // Receive remote audio
    pc.ontrack = async (event) => {
      console.log("VOICE REMOTE TRACK:", event.track.kind);

      if (event.track.kind !== "audio") {
        return;
      }

      const stream =
        event.streams?.[0] ||
        new MediaStream([event.track]);

      if (!remoteAudio.current) {
        console.error("Remote audio element not found");
        return;
      }

      remoteAudio.current.srcObject = stream;

      remoteAudio.current.autoplay = true;
      remoteAudio.current.controls = false;
      remoteAudio.current.muted = false;
      remoteAudio.current.volume = 1;

      try {
        await remoteAudio.current.play();

        console.log("REMOTE AUDIO PLAYING");
      } catch (error) {
        console.error(
          "REMOTE AUDIO PLAY ERROR:",
          error
        );
      }
    };

    // ICE candidates
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
        "Voice connection:",
        pc.connectionState
      );

      if (pc.connectionState === "connected") {
        console.log("VOICE CALL CONNECTED");
        setCallState("connected");
      }

      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        cleanupCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(
        "Voice ICE:",
        pc.iceConnectionState
      );
    };

    peerConnection.current = pc;

    return pc;
  };

  // -----------------------------
  // SOCKET EVENTS
  // -----------------------------

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit("join", currentUser.id);

    const handleIncomingCall = (data) => {
      if (data.callType !== "voice") return;

      console.log("INCOMING VOICE CALL:", data);

      setIncomingCall(data);
      setCallState("incoming");

      startRingtone();
    };

    const handleOffer = (data) => {
      if (data.callType !== "voice") return;

      console.log("VOICE OFFER RECEIVED");

      pendingOffer.current = data.offer;
    };

    const handleAnswer = async (data) => {
      if (data.callType !== "voice") return;

      console.log("VOICE ANSWER RECEIVED");

      if (!peerConnection.current) {
        console.error("No peer connection");
        return;
      }

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );

        await flushPendingCandidates();

        setCallState("connected");
      } catch (error) {
        console.error(
          "VOICE ANSWER ERROR:",
          error
        );
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.callType !== "voice") return;

      if (
        !peerConnection.current ||
        !peerConnection.current.remoteDescription
      ) {
        pendingCandidates.current.push(
          data.candidate
        );

        return;
      }

      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      } catch (error) {
        console.error(
          "VOICE ICE ERROR:",
          error
        );
      }
    };

    const handleCallEnded = (data) => {
      if (
        data?.callType &&
        data.callType !== "voice"
      ) {
        return;
      }

      console.log("VOICE CALL ENDED");

      cleanupCall();
    };

    socket.on(
      "incoming_call",
      handleIncomingCall
    );

    socket.on(
      "webrtc_offer",
      handleOffer
    );

    socket.on(
      "webrtc_answer",
      handleAnswer
    );

    socket.on(
      "webrtc_ice_candidate",
      handleIceCandidate
    );

    socket.on(
      "call_ended",
      handleCallEnded
    );

    return () => {
      socket.off(
        "incoming_call",
        handleIncomingCall
      );

      socket.off(
        "webrtc_offer",
        handleOffer
      );

      socket.off(
        "webrtc_answer",
        handleAnswer
      );

      socket.off(
        "webrtc_ice_candidate",
        handleIceCandidate
      );

      socket.off(
        "call_ended",
        handleCallEnded
      );
    };
  }, [currentUser?.id]);

  // -----------------------------
  // START CALL
  // -----------------------------

  const startCall = async () => {
    if (!currentUser || !selectedUser) return;

    try {
      console.log("Starting voice call...");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

      console.log(
        "Microphone tracks:",
        stream.getAudioTracks()
      );

      localStream.current = stream;

      const pc = createPeerConnection(
        selectedUser.id
      );

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
      });

      setCallState("calling");

      console.log("Voice offer sent");
    } catch (error) {
      console.error(
        "START VOICE CALL ERROR:",
        error
      );

      alert(
        "Microphone permission is required for voice calls."
      );

      cleanupCall();
    }
  };

  // -----------------------------
  // ACCEPT CALL
  // -----------------------------

  const acceptCall = async () => {
    if (!incomingCall) return;

    if (!pendingOffer.current) {
      console.error("Voice offer not received");
      return;
    }

    try {
      stopRingtone();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

      console.log(
        "Receiver microphone:",
        stream.getAudioTracks()
      );

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

      const answer =
        await pc.createAnswer();

      await pc.setLocalDescription(answer);

      socket.emit("webrtc_answer", {
        receiverId: incomingCall.callerId,
        answer,
        callType: "voice",
      });

      pendingOffer.current = null;

      setIncomingCall(null);
      setCallState("connected");

      console.log("Voice answer sent");
    } catch (error) {
      console.error(
        "ACCEPT VOICE CALL ERROR:",
        error
      );

      cleanupCall();
    }
  };

  // -----------------------------
  // REJECT
  // -----------------------------

  const rejectCall = () => {
    if (!incomingCall) return;

    socket.emit("end_call", {
      receiverId: incomingCall.callerId,
      callType: "voice",
    });

    cleanupCall();
  };

  // -----------------------------
  // MUTE
  // -----------------------------

  const toggleMute = () => {
    if (!localStream.current) return;

    const audioTracks =
      localStream.current.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMuted((previous) => !previous);
  };

  // -----------------------------
  // END CALL
  // -----------------------------

  const endCall = () => {
    const receiverId =
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
