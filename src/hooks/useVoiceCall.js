import { useEffect, useRef, useState } from "react";
import socket from "../socket";

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
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

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit("join", currentUser.id);

    const handleIncomingCall = (data) => {
      console.log("Incoming call:", data);

      setIncomingCall(data);
      setCallState("incoming");
    };

    const handleOffer = (data) => {
      console.log("WebRTC offer received");

      pendingOffer.current = data.offer;
    };

    const handleAnswer = async (data) => {
      console.log("WebRTC answer received");

      if (!peerConnection.current) return;

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );

        await flushPendingCandidates();

        setCallState("connected");
      } catch (error) {
        console.error("Set answer error:", error);
      }
    };

    const handleIceCandidate = async (data) => {
      console.log("ICE candidate received");

      if (!peerConnection.current) {
        pendingCandidates.current.push(data.candidate);
        return;
      }

      try {
        if (
          peerConnection.current.remoteDescription
        ) {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } else {
          pendingCandidates.current.push(data.candidate);
        }
      } catch (error) {
        console.error(
          "ICE candidate error:",
          error
        );
      }
    };

    const handleCallEnded = () => {
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

  const flushPendingCandidates = async () => {
    if (!peerConnection.current) return;

    for (const candidate of pendingCandidates.current) {
      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error(
          "Pending ICE error:",
          error
        );
      }
    }

    pendingCandidates.current = [];
  };

  const createPeerConnection = (receiverId) => {
    const pc = new RTCPeerConnection(
      ICE_SERVERS
    );

    // Receive remote audio
    pc.ontrack = (event) => {
      console.log("Remote track received");

      const [stream] = event.streams;

      if (remoteAudio.current && stream) {
        remoteAudio.current.srcObject = stream;

        remoteAudio.current
          .play()
          .catch((error) => {
            console.log(
              "Audio autoplay blocked:",
              error
            );
          });
      }
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(
          "webrtc_ice_candidate",
          {
            receiverId,
            candidate: event.candidate,
          }
        );
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(
        "Connection state:",
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

  const startCall = async () => {
    if (!currentUser || !selectedUser) {
      return;
    }

    try {
      console.log("Starting voice call...");

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: false,
          }
        );

      console.log(
        "Microphone access granted"
      );

      localStream.current = stream;

      const pc =
        createPeerConnection(
          selectedUser.id
        );

      stream
        .getTracks()
        .forEach((track) => {
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
        callType: "voice",
      });

      socket.emit("webrtc_offer", {
        receiverId: selectedUser.id,
        offer,
      });

      setCallState("calling");
    } catch (error) {
      console.error(
        "Start call error:",
        error
      );

      alert(
        "Microphone permission is required for voice calls."
      );

      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (
      !incomingCall ||
      !pendingOffer.current
    ) {
      console.log(
        "No incoming offer available"
      );

      return;
    }

    try {
      console.log(
        "Accepting voice call..."
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: false,
          }
        );

      console.log(
        "Microphone access granted"
      );

      localStream.current = stream;

      const pc =
        createPeerConnection(
          incomingCall.callerId
        );

      stream
        .getTracks()
        .forEach((track) => {
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
      });

      setIncomingCall(null);
      setCallState("connected");
    } catch (error) {
      console.error(
        "Accept call error:",
        error
      );

      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;

    socket.emit("end_call", {
      receiverId:
        incomingCall.callerId,
    });

    cleanupCall();
  };

  const toggleMute = () => {
    if (!localStream.current) return;

    const tracks =
      localStream.current.getAudioTracks();

    tracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMuted((previous) => !previous);
  };

  const endCall = () => {
    const receiverId =
      selectedUser?.id ||
      incomingCall?.callerId;

    if (receiverId) {
      socket.emit("end_call", {
        receiverId,
      });
    }

    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream.current) {
      localStream.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();

      peerConnection.current = null;
    }

    if (remoteAudio.current) {
      remoteAudio.current.srcObject =
        null;
    }

    pendingOffer.current = null;
    pendingCandidates.current = [];

    setIncomingCall(null);
    setCallState("idle");
    setMuted(false);
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
