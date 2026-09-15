import {
  useEffect,
  useRef,
  useState,
} from "react";

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

function ChatWindow({
  selectedUser,
}) {
  const [messages, setMessages] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  const messageSound =
    useRef(null);

  // ==================================================
  // CURRENT USER
  // ==================================================

  const token =
    localStorage.getItem("token");

  const currentUser =
    JSON.parse(
      localStorage.getItem("user")
    );

  // ==================================================
  // MESSAGE SOUND
  // ==================================================

  useEffect(() => {
    messageSound.current =
      new Audio(
        "/sounds/message.mp3"
      );

    messageSound.current.volume =
      0.7;

    return () => {
      if (messageSound.current) {
        messageSound.current.pause();
        messageSound.current = null;
      }
    };
  }, []);

  const playMessageSound = () => {
    if (!messageSound.current) {
      return;
    }

    messageSound.current.currentTime =
      0;

    messageSound.current
      .play()
      .catch(() => {});
  };

  // ==================================================
  // VOICE CALL
  // ==================================================

  const {
    callState:
      voiceCallState,

    incomingCall:
      incomingVoiceCall,

    muted:
      voiceMuted,

    remoteAudio,

    startCall:
      startVoiceCall,

    acceptCall:
      acceptVoiceCall,

    rejectCall:
      rejectVoiceCall,

    toggleMute:
      toggleVoiceMute,

    endCall:
      endVoiceCall,

  } = useVoiceCall(
    currentUser,
    selectedUser
  );

  // ==================================================
  // VIDEO CALL
  // ==================================================

  const {
    callState:
      videoCallState,

    incomingCall:
      incomingVideoCall,

    muted:
      videoMuted,

    camera,

    remoteVideo,

    localVideo,

    startCall:
      startVideoCall,

    acceptCall:
      acceptVideoCall,

    rejectCall:
      rejectVideoCall,

    toggleMute:
      toggleVideoMute,

    toggleCamera,

    endCall:
      endVideoCall,

  } = useVideoCall(
    currentUser,
    selectedUser
  );

  // ==================================================
  // JOIN SOCKET ROOM
  // ==================================================

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const joinRoom = () => {
      socket.emit(
        "join",
        currentUser.id
      );

      console.log(
        "Joined socket room:",
        currentUser.id
      );
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on(
      "connect",
      joinRoom
    );

    return () => {
      socket.off(
        "connect",
        joinRoom
      );
    };
  }, [currentUser?.id]);

  // ==================================================
  // SCROLL
  // ==================================================

  const scrollToBottom =
    (smooth = true) => {
      if (!messagesEndRef.current) {
        return;
      }

      messagesEndRef.current.scrollIntoView(
        {
          behavior: smooth
            ? "smooth"
            : "auto",
          block: "end",
        }
      );
    };

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    setTimeout(() => {
      scrollToBottom(true);
    }, 50);
  }, [messages]);

  // ==================================================
  // RECEIVE MESSAGE
  // ==================================================

  useEffect(() => {
    const handleReceiveMessage =
      (data) => {
        if (
          Number(data.senderId) ===
          Number(currentUser?.id)
        ) {
          return;
        }

        if (
          Number(data.senderId) !==
          Number(selectedUser?.id)
        ) {
          return;
        }

        const newMessage = {
          id:
            `socket-${Date.now()}-${Math.random()}`,

          message:
            data.message,

          sender_id:
            data.senderId,

          created_at:
            new Date().toISOString(),
        };

        setMessages(
          (previous) => [
            ...previous,
            newMessage,
          ]
        );

        playMessageSound();

        setTimeout(() => {
          scrollToBottom(true);
        }, 100);
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
  }, [
    selectedUser?.id,
    currentUser?.id,
  ]);

  // ==================================================
  // LOAD MESSAGES
  // ==================================================

  useEffect(() => {
    if (
      !selectedUser ||
      !token
    ) {
      return;
    }

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

          setTimeout(() => {
            scrollToBottom(false);
          }, 100);

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
  }, [
    selectedUser?.id,
    token,
  ]);

  // ==================================================
  // SEND MESSAGE
  // ==================================================

  const sendMessage =
    async (text) => {
      if (
        !text.trim() ||
        !selectedUser ||
        !currentUser
      ) {
        return;
      }

      const messageText =
        text.trim();

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
                message:
                  messageText,
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

        setMessages(
          (previous) => [
            ...previous,
            data.message,
          ]
        );

        socket.emit(
          "send_message",
          {
            senderId:
              currentUser.id,

            receiverId:
              selectedUser.id,

            message:
              messageText,
          }
        );

        setTimeout(() => {
          scrollToBottom(true);
        }, 50);

      } catch (error) {
        console.error(
          "Send message error:",
          error
        );
      }
    };

  // ==================================================
  // EMPTY
  // ==================================================

  if (!selectedUser) {
    return (
      <div className="empty-chat">
        <h2>
          Select a user
        </h2>

        <p>
          Choose someone from the sidebar
          to start chatting.
        </p>
      </div>
    );
  }

  const isVoiceCallActive =
    voiceCallState !== "idle";

  const isVideoCallActive =
    videoCallState !== "idle";

  // ==================================================
  // CALL USER OBJECTS
  // ==================================================

  const voiceCallUser =
    incomingVoiceCall
      ? {
          id:
            incomingVoiceCall.callerId,

          name:
            incomingVoiceCall.callerName,

          avatar:
            incomingVoiceCall.callerAvatar ||
            `https://i.pravatar.cc/150?u=${incomingVoiceCall.callerId}`,
        }
      : selectedUser;

  const videoCallUser =
    incomingVideoCall
      ? {
          id:
            incomingVideoCall.callerId,

          name:
            incomingVideoCall.callerName,

          avatar:
            incomingVideoCall.callerAvatar ||
            `https://i.pravatar.cc/150?u=${incomingVideoCall.callerId}`,
        }
      : selectedUser;

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="chat-window">

      {/* ==========================================
          VOICE AUDIO
      ========================================== */}

      <audio
        ref={remoteAudio}
        autoPlay
        playsInline
        controls={false}
        muted={false}
      />

      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="chat-header">

        <div className="chat-user-info">

          <img
            src={
              selectedUser.avatar ||
              `https://i.pravatar.cc/150?u=${selectedUser.id}`
            }
            alt={
              selectedUser.name
            }
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

          <button
            onClick={
              startVoiceCall
            }
            title="Voice call"
            disabled={
              isVoiceCallActive ||
              isVideoCallActive
            }
          >
            <FaPhone />
          </button>

          <button
            onClick={
              startVideoCall
            }
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

      {/* ==========================================
          MESSAGES
      ========================================== */}

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
          style={{
            height: "1px",
          }}
        />

      </div>

      {/* ==========================================
          MESSAGE INPUT
      ========================================== */}

      <MessageInput
        onSend={sendMessage}
      />

      {/* ==========================================
          VOICE CALL
      ========================================== */}

      {isVoiceCallActive && (
        <CallModal
          user={
            voiceCallUser
          }

          callState={
            voiceCallState
          }

          incoming={
            voiceCallState ===
            "incoming"
          }

          muted={
            voiceMuted
          }

          onToggleMute={
            toggleVoiceMute
          }

          onAccept={
            acceptVoiceCall
          }

          onReject={
            rejectVoiceCall
          }

          onClose={
            endVoiceCall
          }
        />
      )}

      {/* ==========================================
          VIDEO CALL
      ========================================== */}

      {isVideoCallActive && (
        <VideoCall
          user={
            videoCallUser
          }

          callState={
            videoCallState
          }

          incoming={
            videoCallState ===
            "incoming"
          }

          muted={
            videoMuted
          }

          camera={
            camera
          }

          remoteVideo={
            remoteVideo
          }

          localVideo={
            localVideo
          }

          onAccept={
            acceptVideoCall
          }

          onReject={
            rejectVideoCall
          }

          onToggleMute={
            toggleVideoMute
          }

          onToggleCamera={
            toggleCamera
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