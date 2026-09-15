import {
  useEffect,
  useRef,
  useState,
} from "react";

import socket from "../socket";

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

  const activeRemoteUser =
    useRef(null);

  const ringtone =
    useRef(null);

  // ==================================================
  // RINGTONE
  // ==================================================

  useEffect(() => {
    ringtone.current =
      new Audio("/sounds/ringtone.mp3");

    ringtone.current.loop = true;
    ringtone.current.volume = 0.8;

    return () => {
      if (ringtone.current) {
        ringtone.current.pause();
        ringtone.current.currentTime = 0;
        ringtone.current = null;
      }
    };
  }, []);

  const startRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.currentTime = 0;

    ringtone.current
      .play()
      .catch((error) => {
        console.log(
          "Ringtone autoplay blocked:",
          error
        );
      });
  };

  const stopRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.pause();
    ringtone.current.currentTime = 0;
  };

  // ==================================================
  // CLEANUP
  // ==================================================

  const cleanupCall = () => {
    console.log(
      "Cleaning up voice call..."
    );

    stopRingtone();

    // Stop microphone
    if (localStream.current) {
      localStream.current
        .getTracks()
        .forEach((track) => {
          track.stop();
          track.enabled = false;
        });

      localStream.current = null;
    }

    // Close WebRTC
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.oniceconnectionstatechange = null;

      try {
        peerConnection.current.close();
      } catch (error) {
        console.log(error);
      }

      peerConnection.current = null;
    }

    // Clear audio
    if (remoteAudio.current) {
      remoteAudio.current.pause();
      remoteAudio.current.srcObject = null;
    }

    pendingOffer.current = null;
    pendingCandidates.current = [];
    activeRemoteUser.current = null;

    setIncomingCall(null);
    setCallState("idle");
    setMuted(false);
  };

  // ==================================================
  // FLUSH ICE
  // ==================================================

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
            "ICE candidate error:",
            error
          );
        }
      }
    };

  // ==================================================
  // CREATE PEER CONNECTION
  // ==================================================

  const createPeerConnection =
    (remoteUserId) => {
      const pc =
        new RTCPeerConnection(
          ICE_SERVERS
        );

      pc.ontrack = (event) => {
        console.log(
          "🎧 Remote voice track received"
        );

        const stream =
          event.streams?.[0];

        if (!stream) return;

        if (!remoteAudio.current) {
          console.error(
            "Remote audio element missing"
          );
          return;
        }

        remoteAudio.current.srcObject =
          stream;

        remoteAudio.current.muted = false;
        remoteAudio.current.volume = 1;

        remoteAudio.current
          .play()
          .then(() => {
            console.log(
              "🔊 Remote audio playing"
            );
          })
          .catch((error) => {
            console.error(
              "Audio play error:",
              error
            );
          });
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        socket.emit(
          "webrtc_ice_candidate",
          {
            callerId:
              currentUser?.id,
            receiverId:
              remoteUserId,
            candidate:
              event.candidate,
            callType: "voice",
          }
        );
      };

      pc.onconnectionstatechange =
        () => {
          console.log(
            "Voice connection:",
            pc.connectionState
          );

          if (
            pc.connectionState ===
            "connected"
          ) {
            stopRingtone();
            setCallState("connected");
          }

          if (
            pc.connectionState ===
              "failed" ||
            pc.connectionState ===
              "closed"
          ) {
            cleanupCall();
          }
        };

      pc.oniceconnectionstatechange =
        () => {
          console.log(
            "Voice ICE:",
            pc.iceConnectionState
          );
        };

      peerConnection.current = pc;

      return pc;
    };

  // ==================================================
  // SOCKET LISTENERS
  // ==================================================

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit(
      "join",
      currentUser.id
    );

    // ------------------------------
    // Incoming call
    // ------------------------------

    const handleIncomingCall =
      (data) => {
        if (
          data?.callType !== "voice"
        ) {
          return;
        }

        console.log(
          "📞 Incoming voice call:",
          data
        );

        activeRemoteUser.current =
          data.callerId;

        setIncomingCall(data);
        setCallState("incoming");

        startRingtone();
      };

    // ------------------------------
    // Offer
    // ------------------------------

    const handleOffer =
      (data) => {
        if (
          data?.callType !== "voice"
        ) {
          return;
        }

        console.log(
          "📨 Voice offer received"
        );

        pendingOffer.current =
          data.offer;

        if (data.callerId) {
          activeRemoteUser.current =
            data.callerId;
        }
      };

    // ------------------------------
    // Answer
    // ------------------------------

    const handleAnswer =
      async (data) => {
        if (
          data?.callType !== "voice"
        ) {
          return;
        }

        if (!peerConnection.current) {
          return;
        }

        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );

          await flushPendingCandidates();

          stopRingtone();

          setCallState("connected");
        } catch (error) {
          console.error(
            "Voice answer error:",
            error
          );
        }
      };

    // ------------------------------
    // ICE
    // ------------------------------

    const handleIceCandidate =
      async (data) => {
        if (
          data?.callType !== "voice"
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

    // ------------------------------
    // Call ended
    // ------------------------------

    const handleCallEnded =
      (data) => {
        if (
          data?.callType &&
          data.callType !== "voice"
        ) {
          return;
        }

        console.log(
          "📴 Voice call ended"
        );

        cleanupCall();
      };

    // ------------------------------
    // Rejected
    // ------------------------------

    const handleCallRejected =
      (data) => {
        if (
          data?.callType !== "voice"
        ) {
          return;
        }

        console.log(
          "Voice call rejected"
        );

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

    socket.on(
      "call_rejected",
      handleCallRejected
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

      socket.off(
        "call_rejected",
        handleCallRejected
      );
    };
  }, [currentUser?.id]);

  // ==================================================
  // START CALL
  // ==================================================

  const startCall = async () => {
    if (
      !currentUser ||
      !selectedUser
    ) {
      return;
    }

    try {
      activeRemoteUser.current =
        selectedUser.id;

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: false,
          }
        );

      localStream.current =
        stream;

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
          callerAvatar:
            currentUser.avatar || null,
          callType: "voice",
        }
      );

      socket.emit(
        "webrtc_offer",
        {
          callerId:
            currentUser.id,
          receiverId:
            selectedUser.id,
          offer,
          callType: "voice",
        }
      );

      setCallState("calling");

      // Caller clicked the button,
      // so browser allows this sound.
      startRingtone();

    } catch (error) {
      console.error(
        "Start voice call error:",
        error
      );

      cleanupCall();

      alert(
        "Please allow microphone permission to make a voice call."
      );
    }
  };

  // ==================================================
  // ACCEPT CALL
  // ==================================================

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
      stopRingtone();

      activeRemoteUser.current =
        incomingCall.callerId;

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: false,
          }
        );

      localStream.current =
        stream;

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
        "call_accepted",
        {
          callerId:
            incomingCall.callerId,
          receiverId:
            currentUser.id,
          callType: "voice",
        }
      );

      socket.emit(
        "webrtc_answer",
        {
          callerId:
            currentUser.id,
          receiverId:
            incomingCall.callerId,
          answer,
          callType: "voice",
        }
      );

      pendingOffer.current = null;

      setIncomingCall(null);
      setCallState("connected");

    } catch (error) {
      console.error(
        "Accept voice call error:",
        error
      );

      cleanupCall();
    }
  };

  // ==================================================
  // REJECT
  // ==================================================

  const rejectCall = () => {
    if (!incomingCall) return;

    socket.emit(
      "call_rejected",
      {
        callerId:
          incomingCall.callerId,
        receiverId:
          currentUser.id,
        callType: "voice",
      }
    );

    socket.emit(
      "end_call",
      {
        callerId:
          currentUser.id,
        receiverId:
          incomingCall.callerId,
        callType: "voice",
      }
    );

    cleanupCall();
  };

  // ==================================================
  // MUTE
  // ==================================================

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
      (previous) => !previous
    );
  };

  // ==================================================
  // END CALL
  // ==================================================

  const endCall = () => {
    const receiverId =
      activeRemoteUser.current ||
      incomingCall?.callerId ||
      selectedUser?.id;

    if (receiverId) {
      socket.emit(
        "end_call",
        {
          callerId:
            currentUser?.id,
          receiverId,
          callType: "voice",
        }
      );
    }

    cleanupCall();
  };

  // ==================================================
  // RETURN
  // ==================================================

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