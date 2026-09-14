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

  // --------------------------------------------------
  // Cleanup
  // --------------------------------------------------

  const cleanupCall = () => {
    console.log("Cleaning up call...");

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

  // --------------------------------------------------
  // Flush ICE candidates
  // --------------------------------------------------

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

        console.log("Pending ICE candidate added");
      } catch (error) {
        console.error(
          "Pending ICE candidate error:",
          error
        );
      }
    }
  };

  // --------------------------------------------------
  // Create Peer Connection
  // --------------------------------------------------

  const createPeerConnection = (receiverId) => {
    console.log(
      "Creating peer connection for:",
      receiverId
    );

    const pc = new RTCPeerConnection(
      ICE_SERVERS
    );

    // Remote audio
    pc.ontrack = (event) => {
      console.log("================================");
      console.log("REMOTE AUDIO TRACK RECEIVED");
      console.log("================================");

      const stream =
        event.streams?.[0];

      if (!stream) {
        console.error(
          "No remote stream received"
        );
        return;
      }

      console.log(
        "Remote stream:",
        stream
      );

      console.log(
        "Remote audio tracks:",
        stream.getAudioTracks()
      );

      if (!remoteAudio.current) {
        console.error(
          "Remote audio element does not exist"
        );
        return;
      }

      remoteAudio.current.srcObject =
        stream;

      remoteAudio.current.volume = 1.0;
      remoteAudio.current.muted = false;

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

    // ICE
    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      console.log(
        "Sending ICE candidate"
      );

      socket.emit(
        "webrtc_ice_candidate",
        {
          receiverId,
          candidate: event.candidate,
        }
      );
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      console.log(
        "Connection state:",
        pc.connectionState
      );

      if (
        pc.connectionState ===
        "connected"
      ) {
        console.log(
          "WEBRTC CONNECTED"
        );

        setCallState("connected");
      }

      if (
        pc.connectionState ===
          "failed" ||
        pc.connectionState ===
          "disconnected"
      ) {
        console.log(
          "WEBRTC CONNECTION FAILED/DISCONNECTED"
        );

        cleanupCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(
        "ICE connection state:",
        pc.iceConnectionState
      );
    };

    peerConnection.current = pc;

    return pc;
  };

  // --------------------------------------------------
  // Socket listeners
  // --------------------------------------------------

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    socket.emit(
      "join",
      currentUser.id
    );

    console.log(
      "Joined socket room:",
      currentUser.id
    );

    // Incoming call
    const handleIncomingCall = (
      data
    ) => {
      console.log(
        "INCOMING CALL:",
        data
      );

      setIncomingCall(data);
      setCallState("incoming");
    };

    // Offer
    const handleOffer = (
      data
    ) => {
      console.log(
        "WEBRTC OFFER RECEIVED"
      );

      pendingOffer.current =
        data.offer;

      console.log(
        "Offer stored"
      );
    };

    // Answer
    const handleAnswer = async (
      data
    ) => {
      console.log(
        "WEBRTC ANSWER RECEIVED"
      );

      if (!peerConnection.current) {
        console.error(
          "Peer connection does not exist"
        );
        return;
      }

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(
            data.answer
          )
        );

        console.log(
          "Remote answer set"
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

    // ICE candidate
    const handleIceCandidate = async (
      data
    ) => {
      console.log(
        "ICE CANDIDATE RECEIVED"
      );

      if (
        !peerConnection.current
      ) {
        console.log(
          "Peer connection not ready. Storing ICE."
        );

        pendingCandidates.current.push(
          data.candidate
        );

        return;
      }

      if (
        !peerConnection.current
          .remoteDescription
      ) {
        console.log(
          "Remote description not ready. Storing ICE."
        );

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

        console.log(
          "ICE candidate added"
        );
      } catch (error) {
        console.error(
          "ICE candidate error:",
          error
        );
      }
    };

    // Call ended
    const handleCallEnded = () => {
      console.log(
        "CALL ENDED BY OTHER USER"
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

  // --------------------------------------------------
  // Start Call
  // --------------------------------------------------

  const startCall = async () => {
    if (
      !currentUser ||
      !selectedUser
    ) {
      return;
    }

    try {
      console.log(
        "================================"
      );

      console.log(
        "STARTING VOICE CALL"
      );

      console.log(
        "================================"
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: false,
          }
        );

      console.log(
        "Microphone permission granted"
      );

      console.log(
        "Local audio tracks:",
        stream.getAudioTracks()
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

      console.log(
        "Local tracks added"
      );

      const offer =
        await pc.createOffer();

      await pc.setLocalDescription(
        offer
      );

      console.log(
        "Local offer created"
      );

      // Tell receiver about call
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
        }
      );

      console.log(
        "Offer sent"
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

  // --------------------------------------------------
  // Accept Call
  // --------------------------------------------------

  const acceptCall = async () => {
    if (
      !incomingCall
    ) {
      console.error(
        "No incoming call"
      );

      return;
    }

    if (
      !pendingOffer.current
    ) {
      console.error(
        "No WebRTC offer received yet"
      );

      return;
    }

    try {
      console.log(
        "================================"
      );

      console.log(
        "ACCEPTING VOICE CALL"
      );

      console.log(
        "================================"
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: false,
          }
        );

      console.log(
        "Microphone permission granted"
      );

      console.log(
        "Local audio tracks:",
        stream.getAudioTracks()
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

      console.log(
        "Local tracks added"
      );

      // Set caller offer
      await pc.setRemoteDescription(
        new RTCSessionDescription(
          pendingOffer.current
        )
      );

      console.log(
        "Remote offer set"
      );

      // Add queued ICE
      await flushPendingCandidates();

      // Create answer
      const answer =
        await pc.createAnswer();

      await pc.setLocalDescription(
        answer
      );

      console.log(
        "Answer created"
      );

      socket.emit(
        "webrtc_answer",
        {
          receiverId:
            incomingCall.callerId,

          answer,
        }
      );

      console.log(
        "Answer sent"
      );

      pendingOffer.current =
        null;

      setIncomingCall(
        null
      );

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

  // --------------------------------------------------
  // Reject
  // --------------------------------------------------

  const rejectCall = () => {
    if (!incomingCall) {
      return;
    }

    socket.emit(
      "end_call",
      {
        receiverId:
          incomingCall.callerId,
      }
    );

    cleanupCall();
  };

  // --------------------------------------------------
  // Mute
  // --------------------------------------------------

  const toggleMute = () => {
    if (!localStream.current) {
      return;
    }

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

  // --------------------------------------------------
  // End Call
  // --------------------------------------------------

  const endCall = () => {
    const receiverId =
      selectedUser?.id ||
      incomingCall?.callerId;

    if (receiverId) {
      socket.emit(
        "end_call",
        {
          receiverId,
        }
      );
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
