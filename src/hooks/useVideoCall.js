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

function useVideoCall(currentUser, selectedUser) {
  const [callState, setCallState] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null);

  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const peerConnection = useRef(null);

  const pendingOffer = useRef(null);
  const pendingCandidates = useRef([]);

  const ringtone = useRef(null);

  // ===============================
  // RINGTONE
  // ===============================

  useEffect(() => {
    ringtone.current = new Audio("/sounds/ringtone.mp3");
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

    ringtone.current.play().catch((error) => {
      console.log("Ringtone blocked:", error);
    });
  };

  const stopRingtone = () => {
    if (!ringtone.current) return;

    ringtone.current.pause();
    ringtone.current.currentTime = 0;
  };

  // ===============================
  // CLEANUP
  // ===============================

  const cleanupCall = () => {
    stopRingtone();

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange = null;

      peerConnection.current.close();
      peerConnection.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);

    pendingOffer.current = null;
    pendingCandidates.current = [];

    setIncomingCall(null);
    setCallState("idle");

    setMuted(false);
    setCamera(true);
  };

  // ===============================
  // ADD PENDING ICE
  // ===============================

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

  // ===============================
  // CREATE PEER CONNECTION
  // ===============================

  const createPeerConnection = (receiverId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // REMOTE AUDIO + VIDEO
    pc.ontrack = (event) => {
      console.log("Remote track received:", event.track.kind);

      let stream = event.streams?.[0];

      if (!stream) {
        stream = new MediaStream();
        stream.addTrack(event.track);
      }

      setRemoteStream((previousStream) => {
        if (!previousStream) {
          return stream;
        }

        const existingTracks = previousStream.getTracks();

        if (
          event.track.kind === "audio" &&
          !existingTracks.some(
            (track) => track.kind === "audio"
          )
        ) {
          previousStream.addTrack(event.track);
        }

        if (
          event.track.kind === "video" &&
          !existingTracks.some(
            (track) => track.kind === "video"
          )
        ) {
          previousStream.addTrack(event.track);
        }

        return previousStream;
      });
    };

    // ICE
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;

      socket.emit("webrtc_ice_candidate", {
        receiverId,
        candidate: event.candidate,
        callType: "video",
      });
    };

    // CONNECTION
    pc.onconnectionstatechange = () => {
      console.log(
        "Video connection:",
        pc.connectionState
      );

      if (pc.connectionState === "connected") {
        setCallState("connected");
      }

      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        cleanupCall();
      }
    };

    peerConnection.current = pc;

    return pc;
  };

  // ===============================
  // SOCKET EVENTS
  // ===============================

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit("join", currentUser.id);

    // INCOMING CALL
    const handleIncomingCall = (data) => {
      if (data.callType !== "video") return;

      console.log("Incoming video call:", data);

      setIncomingCall(data);
      setCallState("incoming");

      startRingtone();
    };

    // OFFER
    const handleOffer = (data) => {
      if (data.callType !== "video") return;

      console.log("Video offer received");

      pendingOffer.current = data.offer;
    };

    // ANSWER
    const handleAnswer = async (data) => {
      if (data.callType !== "video") return;

      if (!peerConnection.current) {
        console.log("No video peer connection");
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
          "Video answer error:",
          error
        );
      }
    };

    // ICE
    const handleIceCandidate = async (data) => {
      if (data.callType !== "video") return;

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
          "Video ICE error:",
          error
        );
      }
    };

    // END CALL
    const handleCallEnded = (data) => {
      if (
        data?.callType &&
        data.callType !== "video"
      ) {
        return;
      }

      console.log("Video call ended");

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

  // ===============================
  // START VIDEO CALL
  // ===============================

  const startVideoCall = async () => {
    if (!currentUser || !selectedUser) return;

    try {
      console.log(
        "Starting video call..."
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: true,
          }
        );

      console.log(
        "Local video/audio stream:",
        stream
      );

      setLocalStream(stream);

      const pc = createPeerConnection(
        selectedUser.id
      );

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer =
        await pc.createOffer();

      await pc.setLocalDescription(offer);

      socket.emit("call_user", {
        callerId: currentUser.id,
        receiverId: selectedUser.id,
        callerName: currentUser.name,
        callType: "video",
      });

      socket.emit("webrtc_offer", {
        receiverId: selectedUser.id,
        offer,
        callType: "video",
      });

      setCallState("calling");
    } catch (error) {
      console.error(
        "START VIDEO CALL ERROR:",
        error
      );

      alert(
        "Camera and microphone permission is required for video calls."
      );

      cleanupCall();
    }
  };

  // ===============================
  // ACCEPT VIDEO CALL
  // ===============================

  const acceptVideoCall = async () => {
    if (!incomingCall) return;

    if (!pendingOffer.current) {
      console.error(
        "No video offer received"
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

      console.log(
        "Incoming local stream:",
        stream
      );

      setLocalStream(stream);

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

      await pc.setLocalDescription(
        answer
      );

      socket.emit("webrtc_answer", {
        receiverId:
          incomingCall.callerId,
        answer,
        callType: "video",
      });

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

  // ===============================
  // REJECT
  // ===============================

  const rejectVideoCall = () => {
    if (!incomingCall) return;

    stopRingtone();

    socket.emit("end_call", {
      receiverId:
        incomingCall.callerId,
      callType: "video",
    });

    cleanupCall();
  };

  // ===============================
  // MUTE
  // ===============================

  const toggleMute = () => {
    if (!localStream) return;

    const audioTracks =
      localStream.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMuted((previous) => !previous);
  };

  // ===============================
  // CAMERA
  // ===============================

  const toggleCamera = () => {
    if (!localStream) return;

    const videoTracks =
      localStream.getVideoTracks();

    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setCamera((previous) => !previous);
  };

  // ===============================
  // END CALL
  // ===============================

  const endVideoCall = () => {
    const receiverId =
      incomingCall?.callerId ||
      selectedUser?.id;

    if (receiverId) {
      socket.emit("end_call", {
        receiverId,
        callType: "video",
      });
    }

    cleanupCall();
  };

  return {
    callState,
    incomingCall,

    muted,
    camera,

    localStream,
    remoteStream,

    startVideoCall,
    acceptVideoCall,
    rejectVideoCall,

    toggleMute,
    toggleCamera,

    endVideoCall,
  };
}

export default useVideoCall;