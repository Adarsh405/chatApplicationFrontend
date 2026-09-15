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

function useVideoCall(
  currentUser,
  selectedUser
) {
  const [callState, setCallState] =
    useState("idle");

  const [incomingCall, setIncomingCall] =
    useState(null);

  const [muted, setMuted] =
    useState(false);

  const [camera, setCamera] =
    useState(true);

  const peerConnection =
    useRef(null);

  const localStream =
    useRef(null);

  const remoteVideo =
    useRef(null);

  const localVideo =
    useRef(null);

  const pendingOffer =
    useRef(null);

  const pendingCandidates =
    useRef([]);

  const ringtone =
    useRef(null);

  // =====================================
  // RINGTONE
  // =====================================

  useEffect(() => {
    ringtone.current = new Audio(
      "/sounds/ringtone.mp3"
    );

    ringtone.current.loop = true;
    ringtone.current.volume = 0.8;

    return () => {
      if (ringtone.current) {
        ringtone.current.pause();
        ringtone.current.currentTime = 0;
      }
    };
  }, []);

  const startRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.currentTime = 0;

    ringtone.current
      .play()
      .catch(() => {
        console.log(
          "Browser blocked ringtone autoplay"
        );
      });
  };

  const stopRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.pause();
    ringtone.current.currentTime = 0;
  };

  // =====================================
  // CLEANUP
  // =====================================

  const cleanupCall = () => {
    stopRingtone();

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

    if (remoteVideo.current) {
      remoteVideo.current.pause();
      remoteVideo.current.srcObject = null;
    }

    if (localVideo.current) {
      localVideo.current.pause();
      localVideo.current.srcObject = null;
    }

    pendingOffer.current = null;
    pendingCandidates.current = [];

    setIncomingCall(null);
    setCallState("idle");
    setMuted(false);
    setCamera(true);
  };

  // =====================================
  // ICE QUEUE
  // =====================================

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

  // =====================================
  // CREATE PEER CONNECTION
  // =====================================

  const createPeerConnection = (
    receiverId
  ) => {
    const pc =
      new RTCPeerConnection(
        ICE_SERVERS
      );

    // -------------------------------
    // REMOTE VIDEO
    // -------------------------------

    pc.ontrack = (event) => {
      const stream =
        event.streams?.[0];

      if (!stream) return;

      if (remoteVideo.current) {
        remoteVideo.current.srcObject =
          stream;

        remoteVideo.current
          .play()
          .catch(() => {});
      }
    };

    // -------------------------------
    // ICE
    // -------------------------------

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;

      socket.emit(
        "webrtc_ice_candidate",
        {
          receiverId,
          candidate:
            event.candidate,
          callType: "video",
        }
      );
    };

    // -------------------------------
    // CONNECTION STATE
    // -------------------------------

    pc.onconnectionstatechange =
      () => {
        console.log(
          "Video connection:",
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
            "disconnected" ||
          pc.connectionState ===
            "closed"
        ) {
          cleanupCall();
        }
      };

    peerConnection.current = pc;

    return pc;
  };

  // =====================================
  // SOCKET EVENTS
  // =====================================

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit(
      "join",
      currentUser.id
    );

    // -------------------------------
    // INCOMING CALL
    // -------------------------------

    const handleIncomingCall = (
      data
    ) => {
      console.log(
        "VIDEO INCOMING CALL:",
        data
      );

      if (
        data.callType !== "video"
      ) {
        return;
      }

      setIncomingCall(data);
      setCallState("incoming");

      startRingtone();
    };

    // -------------------------------
    // OFFER
    // -------------------------------

    const handleOffer = (data) => {
      if (
        data.callType !== "video"
      ) {
        return;
      }

      console.log(
        "VIDEO OFFER RECEIVED"
      );

      pendingOffer.current =
        data.offer;
    };

    // -------------------------------
    // ANSWER
    // -------------------------------

    const handleAnswer =
      async (data) => {
        if (
          data.callType !== "video"
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
        } catch (error) {
          console.error(
            "VIDEO ANSWER ERROR:",
            error
          );
        }
      };

    // -------------------------------
    // ICE
    // -------------------------------

    const handleIceCandidate =
      async (data) => {
        if (
          data.callType !== "video"
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
            "VIDEO ICE ERROR:",
            error
          );
        }
      };

    // -------------------------------
    // CALL ENDED
    // -------------------------------

    const handleCallEnded =
      (data) => {
        if (
          data?.callType &&
          data.callType !== "video"
        ) {
          return;
        }

        console.log(
          "VIDEO CALL ENDED"
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

  // =====================================
  // START VIDEO CALL
  // =====================================

  const startCall = async () => {
    if (
      !currentUser ||
      !selectedUser
    ) {
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: true,
          }
        );

      localStream.current = stream;

      if (localVideo.current) {
        localVideo.current.srcObject =
          stream;

        localVideo.current
          .play()
          .catch(() => {});
      }

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

          callType: "video",
        }
      );

      // Send WebRTC offer
      socket.emit(
        "webrtc_offer",
        {
          receiverId:
            selectedUser.id,

          offer,

          callType: "video",
        }
      );

      setCallState("calling");
    } catch (error) {
      console.error(
        "START VIDEO CALL ERROR:",
        error
      );

      if (
        error.name ===
        "NotAllowedError"
      ) {
        alert(
          "Camera and microphone permission are required."
        );
      } else {
        alert(
          "Unable to access camera or microphone."
        );
      }

      cleanupCall();
    }
  };

  // =====================================
  // ACCEPT VIDEO CALL
  // =====================================

  const acceptCall = async () => {
    if (!incomingCall) return;

    if (!pendingOffer.current) {
      console.error(
        "WebRTC offer not received yet"
      );

      return;
    }

    try {
      stopRingtone();

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: true,
          }
        );

      localStream.current = stream;

      if (localVideo.current) {
        localVideo.current.srcObject =
          stream;

        localVideo.current
          .play()
          .catch(() => {});
      }

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

          callType: "video",
        }
      );

      pendingOffer.current = null;

      setIncomingCall(null);
      setCallState("connected");
    } catch (error) {
      console.error(
        "ACCEPT VIDEO CALL ERROR:",
        error
      );

      cleanupCall();
    }
  };

  // =====================================
  // REJECT VIDEO CALL
  // =====================================

  const rejectCall = () => {
    if (!incomingCall) return;

    stopRingtone();

    socket.emit(
      "end_call",
      {
        receiverId:
          incomingCall.callerId,

        callType: "video",
      }
    );

    cleanupCall();
  };

  // =====================================
  // MUTE
  // =====================================

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

  // =====================================
  // CAMERA
  // =====================================

  const toggleCamera = () => {
    if (!localStream.current) {
      return;
    }

    const tracks =
      localStream.current.getVideoTracks();

    tracks.forEach((track) => {
      track.enabled =
        !track.enabled;
    });

    setCamera(
      (previous) => !previous
    );
  };

  // =====================================
  // END CALL
  // =====================================

  const endCall = () => {
    const receiverId =
      incomingCall?.callerId ||
      selectedUser?.id;

    if (receiverId) {
      socket.emit(
        "end_call",
        {
          receiverId,
          callType: "video",
        }
      );
    }

    cleanupCall();
  };

  return {
    callState,
    incomingCall,

    muted,
    camera,

    remoteVideo,
    localVideo,

    startCall,
    acceptCall,
    rejectCall,

    toggleMute,
    toggleCamera,

    endCall,
  };
}

export default useVideoCall;