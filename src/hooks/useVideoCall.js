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

  const peerConnection = useRef(null);

  const localStream = useRef(null);

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  const pendingOffer = useRef(null);
  const pendingCandidates = useRef([]);

  const activeRemoteUserId = useRef(null);

  // ==========================================
  // CLEANUP
  // ==========================================

  const cleanupCall = () => {
    console.log("Cleaning up video call");

    // Stop camera + microphone
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStream.current = null;
    }

    // Close peer
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.onconnectionstatechange =
        null;

      peerConnection.current.close();

      peerConnection.current = null;
    }

    // Clear local video
    if (localVideo.current) {
      localVideo.current.pause();
      localVideo.current.srcObject = null;
    }

    // Clear remote video
    if (remoteVideo.current) {
      remoteVideo.current.pause();
      remoteVideo.current.srcObject = null;
    }

    pendingOffer.current = null;
    pendingCandidates.current = [];

    activeRemoteUserId.current = null;

    setIncomingCall(null);
    setCallState("idle");

    setMuted(false);
    setCamera(true);
  };

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
        console.error(
          "Pending video ICE error:",
          error
        );
      }
    }
  };

  // ==========================================
  // CREATE PEER
  // ==========================================

  const createPeerConnection = (receiverId) => {
    console.log(
      "Creating video peer connection:",
      receiverId
    );

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ------------------------------------------
    // REMOTE VIDEO
    // ------------------------------------------

    pc.ontrack = (event) => {
      console.log("VIDEO REMOTE TRACK RECEIVED");

      let stream = event.streams?.[0];

      if (!stream) {
        stream = new MediaStream();
        stream.addTrack(event.track);
      }

      if (!remoteVideo.current) {
        console.error(
          "Remote video element missing"
        );

        return;
      }

      remoteVideo.current.srcObject = stream;
      remoteVideo.current.autoplay = true;
      remoteVideo.current.playsInline = true;
      remoteVideo.current.muted = false;

      remoteVideo.current
        .play()
        .then(() => {
          console.log("REMOTE VIDEO PLAYING");
        })
        .catch((error) => {
          console.error(
            "Remote video play error:",
            error
          );
        });
    };

    // ------------------------------------------
    // ICE
    // ------------------------------------------

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;

      socket.emit("webrtc_ice_candidate", {
        receiverId,
        candidate: event.candidate,
        callType: "video",
      });
    };

    // ------------------------------------------
    // CONNECTION
    // ------------------------------------------

    pc.onconnectionstatechange = () => {
      console.log(
        "Video connection state:",
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
      if (data.callType !== "video") return;

      console.log(
        "INCOMING VIDEO CALL:",
        data
      );

      activeRemoteUserId.current =
        data.callerId;

      setIncomingCall(data);
      setCallState("incoming");
    };

    const handleOffer = (data) => {
      if (data.callType !== "video") return;

      console.log(
        "VIDEO OFFER RECEIVED"
      );

      pendingOffer.current = data.offer;

      if (data.callerId) {
        activeRemoteUserId.current =
          data.callerId;
      }
    };

    const handleAnswer = async (data) => {
      if (data.callType !== "video") return;

      if (!peerConnection.current) {
        console.error(
          "Video peer connection missing"
        );

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
          "Video answer error:",
          error
        );
      }
    };

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
          new RTCIceCandidate(
            data.candidate
          )
        );
      } catch (error) {
        console.error(
          "Video ICE error:",
          error
        );
      }
    };

    const handleCallEnded = (data) => {
      if (
        data?.callType &&
        data.callType !== "video"
      ) {
        return;
      }

      console.log(
        "VIDEO CALL ENDED BY OTHER USER"
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

  // ==========================================
  // START VIDEO CALL
  // ==========================================

  const startCall = async () => {
    if (!currentUser || !selectedUser) {
      return;
    }

    try {
      console.log(
        "STARTING VIDEO CALL"
      );

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

      localStream.current = stream;

      activeRemoteUserId.current =
        selectedUser.id;

      // Show our camera
      if (localVideo.current) {
        localVideo.current.srcObject =
          stream;

        localVideo.current.muted = true;
        localVideo.current.autoplay = true;
        localVideo.current.playsInline = true;

        await localVideo.current.play();
      }

      const pc =
        createPeerConnection(
          selectedUser.id
        );

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer =
        await pc.createOffer();

      await pc.setLocalDescription(
        offer
      );

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
        callerId: currentUser.id,
      });

      setCallState("calling");

      console.log(
        "VIDEO OFFER SENT"
      );
    } catch (error) {
      console.error(
        "Video start error:",
        error
      );

      alert(
        "Camera and microphone permission are required for video calls."
      );

      cleanupCall();
    }
  };

  // ==========================================
  // ACCEPT VIDEO CALL
  // ==========================================

  const acceptCall = async () => {
    if (!incomingCall) return;

    if (!pendingOffer.current) {
      console.error(
        "No video offer available"
      );

      return;
    }

    try {
      console.log(
        "ACCEPTING VIDEO CALL"
      );

      activeRemoteUserId.current =
        incomingCall.callerId;

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

      localStream.current = stream;

      // Show our camera
      if (localVideo.current) {
        localVideo.current.srcObject =
          stream;

        localVideo.current.muted = true;
        localVideo.current.autoplay = true;
        localVideo.current.playsInline = true;

        await localVideo.current.play();
      }

      const pc =
        createPeerConnection(
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

      console.log(
        "VIDEO CALL ACCEPTED"
      );
    } catch (error) {
      console.error(
        "Video accept error:",
        error
      );

      cleanupCall();
    }
  };

  // ==========================================
  // REJECT
  // ==========================================

  const rejectCall = () => {
    if (!incomingCall) return;

    socket.emit("end_call", {
      receiverId:
        incomingCall.callerId,
      callType: "video",
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
  // CAMERA
  // ==========================================

  const toggleCamera = () => {
    if (!localStream.current) return;

    const videoTracks =
      localStream.current.getVideoTracks();

    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setCamera((previous) => !previous);
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