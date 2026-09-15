import { useEffect, useRef, useState } from "react";
import {
  FaPhone,
  FaVideo,
} from "react-icons/fa";

import Message from "./Message";
import MessageInput from "./MessageInput";
import CallModal from "./CallModal";
import VideoCall from "./VideoCall";

import useVoiceCall from "../hooks/useVoiceCall";
import useVideoCall from "../hooks/useVideoCall";

import socket from "../socket";

function ChatWindow({ selectedUser }) {
  const [messages, setMessages] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  const messageSound =
    useRef(null);

  const token =
    localStorage.getItem("token");

  const currentUser = JSON.parse(
    localStorage.getItem("user")
  );

  // =====================================
  // VOICE CALL
  // =====================================

  const {
    callState: voiceCallState,
    incomingCall: incomingVoiceCall,
    muted: voiceMuted,
    remoteAudio,
    startCall,
    acceptCall,
    rejectCall,
    toggleMute: toggleVoiceMute,
    endCall,
  } = useVoiceCall(
    currentUser,
    selectedUser
  );

  // =====================================
  // VIDEO CALL
  // =====================================

  const {
    callState: videoCallState,
    incomingCall: incomingVideoCall,

    muted: videoMuted,
    camera: videoCamera,

    localStream,
    remoteStream,

    startVideoCall,
    acceptVideoCall,
    rejectVideoCall,

    toggleMute: toggleVideoMute,
    toggleCamera,

    endVideoCall,
  } = useVideoCall(
    currentUser,
    selectedUser
  );

  // =====================================
  // JOIN ROOM
  // =====================================

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit(
      "join",
      currentUser.id
    );
  }, [currentUser?.id]);

  // =====================================
  // MESSAGE SOUND
  // =====================================

  useEffect(() => {
    messageSound.current =
      new Audio("/sounds/message.mp3");

    messageSound.current.volume = 0.5;

    return () => {
      messageSound.current = null;
    };
  }, []);

  // =====================================
  // RECEIVE MESSAGE
  // =====================================

  useEffect(() => {
    const handleReceiveMessage = (
      data
    ) => {
      if (
        Number(data.senderId) !==
        Number(selectedUser?.id)
      ) {
        return;
      }

      const newMessage = {
        id: `socket-${Date.now()}-${Math.random()}`,
        message: data.message,
        sender_id: data.senderId,
        created_at:
          new Date().toISOString(),
      };

      setMessages((previous) => [
        ...previous,
        newMessage,
      ]);

      if (messageSound.current) {
        messageSound.current
          .play()
          .catch(() => {});
      }
    };

    socket.on(
      "receive_message",
      handleReceiveMessage
    );

    return () => {
      socket.off(
        "receive_message",
        handleReceiveMessage
      );
    };
  }, [selectedUser]);

  // =====================================
  // FETCH MESSAGES
  // =====================================

  useEffect(() => {
    if (!selectedUser || !token) return;

    const fetchMessages =
      async () => {
        try {
          setLoading(true);

          const response =
            await fetch(
              `${import.meta.env.VITE_API_URL}/api/messages/${selectedUser.id}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Failed to load messages"
            );
          }

          setMessages(
            data.messages || []
          );
        } catch (error) {
          console.error(
            "Messages error:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    fetchMessages();
  }, [selectedUser, token]);

  // =====================================
  // AUTO SCROLL
  // =====================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =====================================
  // SEND MESSAGE
  // =====================================

  const sendMessage = async (
    text
  ) => {
    if (
      !text.trim() ||
      !selectedUser ||
      !currentUser
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/messages/${selectedUser.id}`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              message: text.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to send message"
        );
      }

      setMessages((previous) => [
        ...previous,
        data.message,
      ]);

      socket.emit(
        "send_message",
        {
          senderId:
            currentUser.id,

          receiverId:
            selectedUser.id,

          message:
            text.trim(),
        }
      );
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );
    }
  };

  // =====================================
  // NO USER
  // =====================================

  if (!selectedUser) {
    return (
      <div className="empty-chat">
        <h2>Select a user</h2>

        <p>
          Choose someone from the
          sidebar to start chatting.
        </p>
      </div>
    );
  }

  // =====================================
  // ACTIVE CALL CHECK
  // =====================================

  const isVideoCallActive =
    videoCallState !== "idle";

  const isVoiceCallActive =
    voiceCallState !== "idle";

  return (
    <div className="chat-window">

      {/* ================================= */}
      {/* REMOTE VOICE AUDIO */}
      {/* ================================= */}

      <audio
        ref={remoteAudio}
        autoPlay
        playsInline
        controls={false}
        style={{
          display: "none",
        }}
      />

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="chat-header">

        <div className="chat-user-info">

          <img
            src={
              selectedUser.avatar ||
              `https://i.pravatar.cc/150?u=${selectedUser.id}`
            }
            alt={selectedUser.name}
          />

          <div>
            <h3>
              {selectedUser.name}
            </h3>

            <span>
              {selectedUser.status ===
              "online"
                ? "Online"
                : "Offline"}
            </span>
          </div>

        </div>

        <div className="chat-actions">

          {/* VOICE */}

          <button
            onClick={startCall}
            title="Voice call"
            disabled={
              isVoiceCallActive ||
              isVideoCallActive
            }
          >
            <FaPhone />
          </button>

          {/* VIDEO */}

          <button
            onClick={startVideoCall}
            title="Video call"
            disabled={
              isVoiceCallActive ||
              isVideoCallActive
            }
          >
            <FaVideo />
          </button>

        </div>

      </div>

      {/* ================================= */}
      {/* MESSAGES */}
      {/* ================================= */}

      <div className="messages-container">

        {loading ? (
          <div className="messages-loading">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">

            <p>
              No messages yet.
            </p>

            <span>
              Start the conversation 👋
            </span>

          </div>
        ) : (
          messages.map(
            (message) => (
              <Message
                key={message.id}
                message={message}
                isOwn={
                  Number(
                    message.sender_id
                  ) ===
                  Number(
                    currentUser.id
                  )
                }
              />
            )
          )
        )}

        <div
          ref={messagesEndRef}
        />

      </div>

      {/* ================================= */}
      {/* INPUT */}
      {/* ================================= */}

      <MessageInput
        onSend={sendMessage}
      />

      {/* ================================= */}
      {/* VOICE CALL */}
      {/* ================================= */}

      {voiceCallState !==
        "idle" && (
        <CallModal
          user={
            incomingVoiceCall
              ? {
                  name:
                    incomingVoiceCall.callerName,

                  avatar:
                    `https://i.pravatar.cc/150?u=${incomingVoiceCall.callerId}`,
                }
              : selectedUser
          }
          callState={
            voiceCallState
          }
          incoming={
            voiceCallState ===
            "incoming"
          }
          muted={voiceMuted}
          onToggleMute={
            toggleVoiceMute
          }
          onAccept={
            acceptCall
          }
          onReject={
            rejectCall
          }
          onClose={
            endCall
          }
        />
      )}

      {/* ================================= */}
      {/* VIDEO CALL */}
      {/* ================================= */}

      {videoCallState !==
        "idle" && (
        <VideoCall
          user={
            incomingVideoCall
              ? {
                  id:
                    incomingVideoCall.callerId,

                  name:
                    incomingVideoCall.callerName,

                  avatar:
                    `https://i.pravatar.cc/150?u=${incomingVideoCall.callerId}`,
                }
              : selectedUser
          }
          callState={
            videoCallState
          }
          incoming={
            videoCallState ===
            "incoming"
          }
          localStream={
            localStream
          }
          remoteStream={
            remoteStream
          }
          muted={videoMuted}
          camera={videoCamera}
          onToggleMute={
            toggleVideoMute
          }
          onToggleCamera={
            toggleCamera
          }
          onAccept={
            acceptVideoCall
          }
          onReject={
            rejectVideoCall
          }
          onClose={
            endVideoCall
          }
        />
      )}

    </div>
  );
}

export default ChatWindow;