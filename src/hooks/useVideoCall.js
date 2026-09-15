import {
  useEffect,
  useRef,
  useState,
} from "react";

import socket from "../socket";

// ==========================================
// STUN SERVER
// ==========================================

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

function useVoiceCall(
  currentUser,
  selectedUser
) {
  const [callState, setCallState] =
    useState("idle");

  const [incomingCall, setIncomingCall] =
    useState(null);

  const [muted, setMuted] =
    useState(false);

  // ========================================
  // REFS
  // ========================================

  const peerConnection =
    useRef(null);

  const localStream =
    useRef(null);

  const remoteAudio =
    useRef(null);

  const pendingOffer =
    useRef(null);

  const pendingCandidates =
    useRef([]);

  const remoteUserId =
    useRef(null);

  // ========================================
  // CLEANUP
  // ========================================

  const cleanupCall = () => {
    console.log(
      "Cleaning voice call..."
    );

    if (localStream.current) {
      localStream.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange =
        null;

      peerConnection.current.close();

      peerConnection.current = null;
    }

    if (remoteAudio.current) {
      remoteAudio.current.pause();
      remoteAudio.current.srcObject =
        null;
    }

    pendingOffer.current = null;
    pendingCandidates.current = [];

    remoteUserId.current = null;

    setIncomingCall(null);
    setCallState("idle");
    setMuted(false);
  };

  // ========================================
  // ADD PENDING ICE
  // ========================================

  const flushPendingCandidates =
    async () => {
      if (!peerConnection.current) {
        return;
      }

      if (
        !peerConnection.current
          .remoteDescription
      ) {
        return;
      }

      const candidates = [
        ...pendingCandidates.current,
      ];

      pendingCandidates.current = [];

      for (const candidate of candidates) {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error(
            "Voice pending ICE error:",
            error
          );
        }
      }
    };

  // ========================================
  // CREATE PEER CONNECTION
  // ========================================

  const createPeerConnection = (
    receiverId
  ) => {
    console.log(
      "Creating voice peer connection:",
      receiverId
    );

    const pc =
      new RTCPeerConnection(
        ICE_SERVERS
      );

    // --------------------------------------
    // REMOTE AUDIO
    // --------------------------------------

    pc.ontrack = (event) => {
      console.log(
        "VOICE REMOTE TRACK RECEIVED"
      );

      const stream =
        event.streams?.[0];

      if (!stream) {
        console.error(
          "No remote voice stream"
        );
        return;
      }

      if (!remoteAudio.current) {
        console.error(
          "Remote audio element not found"
        );
        return;
      }

      remoteAudio.current.srcObject =
        stream;

      remoteAudio.current.autoplay =
        true;

      remoteAudio.current.playsInline =
        true;

      remoteAudio.current.muted =
        false;

      remoteAudio.current.volume = 1;

      console.log(
        "Remote audio tracks:",
        stream.getAudioTracks()
      );

      remoteAudio.current
        .play()
        .then(() => {
          console.log(
            "Remote voice audio playing"
          );
        })
        .catch((error) => {
          console.error(
            "Remote audio play error:",
            error
          );
        });
    };

    // --------------------------------------
    // ICE
    // --------------------------------------

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      socket.emit(
        "webrtc_ice_candidate",
        {
          receiverId,
          candidate: event.candidate,
          callType: "voice",
        }
      );
    };

    // --------------------------------------
    // CONNECTION STATE
    // --------------------------------------

    pc.onconnectionstatechange = () => {
      console.log(
        "Voice connection state:",
        pc.connectionState
      );

      if (
        pc.connectionState ===
        "connected"
      ) {
        setCallState("connected");
      }

      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "disconnected"
      ) {
        cleanupCall();
      }
    };

    peerConnection.current = pc;

    return pc;
  };

  // ========================================
  // SOCKET LISTENERS
  // ========================================

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const handleIncomingCall =
      (data) => {
        if (
          data.callType !==
          "voice"
        ) {
          return;
        }

        console.log(
          "Incoming voice call:",
          data
        );

        remoteUserId.current =
          data.callerId;

        setIncomingCall(data);
        setCallState("incoming");
      };

    // --------------------------------------

    const handleOffer =
      (data) => {
        if (
          data.callType !==
          "voice"
        ) {
          return;
        }

        console.log(
          "Voice offer received"
        );

        pendingOffer.current =
          data.offer;
      };

    // --------------------------------------

    const handleAnswer =
      async (data) => {
        if (
          data.callType !==
          "voice"
        ) {
          return;
        }

        if (
          !peerConnection.current
        ) {
          return;
        }

        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );

          await flushPendingCandidates();

          setCallState("connected");

          console.log(
            "Voice answer accepted"
          );
        } catch (error) {
          console.error(
            "Voice answer error:",
            error
          );
        }
      };

    // --------------------------------------

    const handleIceCandidate =
      async (data) => {
        if (
          data.callType !==
          "voice"
        ) {
          return;
        }

        if (
          !peerConnection.current ||
          !peerConnection.current
            .remoteDescription
        ) {
          pendingCandidates.current.push(
            data.candidate
          );

          return;
        }

        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(
              data.candidate
            )
          );
        } catch (error) {
          console.error(
            "Voice ICE error:",
            error
          );
        }
      };

    // --------------------------------------

    const handleCallEnded =
      (data) => {
        if (
          data?.callType &&
          data.callType !==
            "voice"
        ) {
          return;
        }

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

  // ========================================
  // START VOICE CALL
  // ========================================

  const startCall = async () => {
    if (
      !currentUser ||
      !selectedUser
    ) {
      return;
    }

    try {
      console.log(
        "Starting voice call..."
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          }
        );

      console.log(
        "Microphone permission granted"
      );

      localStream.current =
        stream;

      remoteUserId.current =
        selectedUser.id;

      const pc =
        createPeerConnection(
          selectedUser.id
        );

      stream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(
            track,
            stream
          );
        });

      const offer =
        await pc.createOffer();

      await pc.setLocalDescription(
        offer
      );

      socket.emit(
        "call_user",
        {
          callerId:
            currentUser.id,

          receiverId:
            selectedUser.id,

          callerName:
            currentUser.name,

          callType: "voice",
        }
      );

      socket.emit(
        "webrtc_offer",
        {
          receiverId:
            selectedUser.id,

          offer,

          callType: "voice",
        }
      );

      setCallState("calling");

      console.log(
        "Voice offer sent"
      );
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

  // ========================================
  // ACCEPT VOICE CALL
  // ========================================

  const acceptCall = async () => {
    if (!incomingCall) {
      return;
    }

    if (!pendingOffer.current) {
      console.error(
        "Voice offer not received yet"
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          }
        );

      localStream.current =
        stream;

      remoteUserId.current =
        incomingCall.callerId;

      const pc =
        createPeerConnection(
          incomingCall.callerId
        );

      stream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(
            track,
            stream
          );
        });

      await pc.setRemoteDescription(
        new RTCSessionDescription(
          pendingOffer.current
        )
      );

      await flushPendingCandidates();

      const answer =
        await pc.createAnswer();

      await pc.setLocalDescription(
        answer
      );

      socket.emit(
        "webrtc_answer",
        {
          receiverId:
            incomingCall.callerId,

          answer,

          callType: "voice",
        }
      );

      pendingOffer.current = null;

      setIncomingCall(null);
      setCallState("connected");

      console.log(
        "Voice answer sent"
      );
    } catch (error) {
      console.error(
        "ACCEPT VOICE CALL ERROR:",
        error
      );

      cleanupCall();
    }
  };

  // ========================================
  // REJECT
  // ========================================

  const rejectCall = () => {
    const receiverId =
      incomingCall?.callerId;

    if (receiverId) {
      socket.emit(
        "end_call",
        {
          receiverId,
          callType: "voice",
        }
      );
    }

    cleanupCall();
  };

  // ========================================
  // MUTE
  // ========================================

  const toggleMute = () => {
    if (!localStream.current) {
      return;
    }

    const tracks =
      localStream.current.getAudioTracks();

    tracks.forEach((track) => {
      track.enabled =
        !track.enabled;
    });

    setMuted(
      (previous) =>
        !previous
    );
  };

  // ========================================
  // END CALL
  // ========================================

  const endCall = () => {
    const receiverId =
      remoteUserId.current ||
      selectedUser?.id;

    if (receiverId) {
      socket.emit(
        "end_call",
        {
          receiverId,
          callType: "voice",
        }
      );
    }

    cleanupCall();
  };

  // ========================================
  // RETURN
  // ========================================

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