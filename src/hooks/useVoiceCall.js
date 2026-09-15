import {
  useEffect,
  useRef,
  useState,
} from "react";

import socket from "../socket";

const ICE_SERVERS = {
  iceServers: [
    {
      urls:
        "stun:stun.l.google.com:19302",
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

  // =================================
  // WEBRTC REFS
  // =================================

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

  // =================================
  // RINGTONE
  // =================================

  const ringtone =
    useRef(null);

  useEffect(() => {
    ringtone.current =
      new Audio(
        "/sounds/ringtone.mp3"
      );

    ringtone.current.loop =
      true;

    ringtone.current.volume =
      0.8;

    return () => {
      if (ringtone.current) {
        ringtone.current.pause();

        ringtone.current.currentTime =
          0;
      }
    };
  }, []);

  // =================================
  // START RINGTONE
  // =================================

  const startRingtone = () => {
    if (!ringtone.current)
      return;

    ringtone.current.currentTime =
      0;

    ringtone.current
      .play()
      .then(() => {
        console.log(
          "Ringtone started"
        );
      })
      .catch((error) => {
        console.log(
          "Ringtone blocked:",
          error
        );
      });
  };

  // =================================
  // STOP RINGTONE
  // =================================

  const stopRingtone = () => {
    if (!ringtone.current)
      return;

    ringtone.current.pause();

    ringtone.current.currentTime =
      0;
  };

  // =================================
  // CLEANUP
  // =================================

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
        });

      localStream.current =
        null;
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.ontrack =
        null;

      peerConnection.current.onicecandidate =
        null;

      peerConnection.current.onconnectionstatechange =
        null;

      peerConnection.current.close();

      peerConnection.current =
        null;
    }

    // Clear remote audio
    if (remoteAudio.current) {
      remoteAudio.current.pause();

      remoteAudio.current.srcObject =
        null;
    }

    pendingOffer.current =
      null;

    pendingCandidates.current =
      [];

    setIncomingCall(null);

    setCallState("idle");

    setMuted(false);
  };

  // =================================
  // FLUSH ICE
  // =================================

  const flushPendingCandidates =
    async () => {
      if (!peerConnection.current)
        return;

      if (
        !peerConnection.current
          .remoteDescription
      ) {
        return;
      }

      const candidates = [
        ...pendingCandidates.current,
      ];

      pendingCandidates.current =
        [];

      for (
        const candidate of candidates
      ) {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );

          console.log(
            "Pending ICE candidate added"
          );
        } catch (error) {
          console.error(
            "Pending ICE candidate error:",
            error
          );
        }
      }
    };

  // =================================
  // CREATE PEER CONNECTION
  // =================================

  const createPeerConnection = (
    receiverId
  ) => {
    console.log(
      "Creating peer connection:",
      receiverId
    );

    const pc =
      new RTCPeerConnection(
        ICE_SERVERS
      );

    // =================================
    // REMOTE AUDIO
    // =================================

    pc.ontrack = (event) => {
      console.log(
        "REMOTE AUDIO TRACK RECEIVED"
      );

      const stream =
        event.streams?.[0];

      if (!stream) {
        console.error(
          "No remote stream"
        );

        return;
      }

      if (!remoteAudio.current) {
        console.error(
          "Remote audio element missing"
        );

        return;
      }

      remoteAudio.current.srcObject =
        stream;

      remoteAudio.current.volume =
        1;

      remoteAudio.current.muted =
        false;

      remoteAudio.current
        .play()
        .then(() => {
          console.log(
            "REMOTE AUDIO PLAYING"
          );
        })
        .catch((error) => {
          console.error(
            "Remote audio play failed:",
            error
          );
        });
    };

    // =================================
    // ICE
    // =================================

    pc.onicecandidate = (
      event
    ) => {
      if (!event.candidate)
        return;

      socket.emit(
        "webrtc_ice_candidate",
        {
          receiverId,

          candidate:
            event.candidate,

          callType:
            "voice",
        }
      );
    };

    // =================================
    // CONNECTION STATE
    // =================================

    pc.onconnectionstatechange =
      () => {
        console.log(
          "Connection state:",
          pc.connectionState
        );

        if (
          pc.connectionState ===
          "connected"
        ) {
          setCallState(
            "connected"
          );
        }

        if (
          pc.connectionState ===
            "failed" ||
          pc.connectionState ===
            "disconnected" ||
          pc.connectionState ===
            "closed"
        ) {
          cleanupCall();
        }
      };

    peerConnection.current =
      pc;

    return pc;
  };

  // =================================
  // SOCKET LISTENERS
  // =================================

  useEffect(() => {
    if (!currentUser?.id)
      return;

    socket.emit(
      "join",
      currentUser.id
    );

    // =================================
    // INCOMING CALL
    // =================================

    const handleIncomingCall =
      (data) => {
        console.log(
          "INCOMING CALL:",
          data
        );

        // Ignore video calls
        if (
          data.callType !==
          "voice"
        ) {
          return;
        }

        setIncomingCall(data);

        setCallState(
          "incoming"
        );

        startRingtone();
      };

    // =================================
    // OFFER
    // =================================

    const handleOffer =
      (data) => {
        if (
          data.callType !==
          "voice"
        ) {
          return;
        }

        console.log(
          "VOICE OFFER RECEIVED"
        );

        pendingOffer.current =
          data.offer;
      };

    // =================================
    // ANSWER
    // =================================

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

          setCallState(
            "connected"
          );
        } catch (error) {
          console.error(
            "Set answer error:",
            error
          );
        }
      };

    // =================================
    // ICE
    // =================================

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
            "ICE error:",
            error
          );
        }
      };

    // =================================
    // CALL ENDED
    // =================================

    const handleCallEnded =
      (data) => {
        if (
          data?.callType &&
          data.callType !==
            "voice"
        ) {
          return;
        }

        console.log(
          "VOICE CALL ENDED"
        );

        stopRingtone();

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

  // =================================
  // START CALL
  // =================================

  const startCall =
    async () => {
      if (
        !currentUser ||
        !selectedUser
      ) {
        return;
      }

      try {
        console.log(
          "STARTING VOICE CALL"
        );

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

        // Tell receiver
        socket.emit(
          "call_user",
          {
            callerId:
              currentUser.id,

            receiverId:
              selectedUser.id,

            callerName:
              currentUser.name,

            callType:
              "voice",
          }
        );

        // Send offer
        socket.emit(
          "webrtc_offer",
          {
            receiverId:
              selectedUser.id,

            offer,

            callType:
              "voice",
          }
        );

        setCallState(
          "calling"
        );

      } catch (error) {
        console.error(
          "START CALL ERROR:",
          error
        );

        alert(
          "Microphone permission is required for voice calls."
        );

        cleanupCall();
      }
    };

  // =================================
  // ACCEPT CALL
  // =================================

  const acceptCall =
    async () => {
      if (!incomingCall)
        return;

      if (!pendingOffer.current) {
        console.error(
          "No offer received"
        );

        return;
      }

      try {
        stopRingtone();

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
          "webrtc_answer",
          {
            receiverId:
              incomingCall.callerId,

            answer,

            callType:
              "voice",
          }
        );

        pendingOffer.current =
          null;

        setIncomingCall(null);

        setCallState(
          "connected"
        );

      } catch (error) {
        console.error(
          "ACCEPT CALL ERROR:",
          error
        );

        cleanupCall();
      }
    };

  // =================================
  // REJECT CALL
  // =================================

  const rejectCall =
    () => {
      if (!incomingCall)
        return;

      stopRingtone();

      socket.emit(
        "end_call",
        {
          receiverId:
            incomingCall.callerId,

          callType:
            "voice",
        }
      );

      cleanupCall();
    };

  // =================================
  // MUTE
  // =================================

  const toggleMute =
    () => {
      if (!localStream.current)
        return;

      const tracks =
        localStream.current.getAudioTracks();

      tracks.forEach(
        (track) => {
          track.enabled =
            !track.enabled;
        }
      );

      setMuted(
        (previous) =>
          !previous
      );
    };

  // =================================
  // END CALL
  // =================================

  const endCall =
    () => {
      const receiverId =
        incomingCall?.callerId ||
        selectedUser?.id;

      if (receiverId) {
        socket.emit(
          "end_call",
          {
            receiverId,

            callType:
              "voice",
          }
        );
      }

      stopRingtone();

      cleanupCall();
    };

  // =================================
  // RETURN
  // =================================

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
