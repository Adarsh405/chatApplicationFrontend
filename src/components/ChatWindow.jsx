import { useEffect, useState } from "react";
import { FaPhone, FaVideo } from "react-icons/fa";

import Message from "./Message";
import MessageInput from "./MessageInput";
import CallModal from "./CallModal";
import VideoCall from "./VideoCall";

import useVoiceCall from "../hooks/useVoiceCall";
import socket from "../socket";

function ChatWindow({ selectedUser }) {
  const [messages, setMessages] = useState([]);
  const [videoCall, setVideoCall] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const currentUser = JSON.parse(
    localStorage.getItem("user")
  );

  // =================================
  // VOICE CALL
  // =================================

  const {
    callState,
    incomingCall,
    muted,
    remoteAudio,
    startCall,
    acceptCall,
    rejectCall,
    toggleMute,
    endCall,
  } = useVoiceCall(
    currentUser,
    selectedUser
  );

  // =================================
  // JOIN SOCKET ROOM
  // =================================

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.emit(
      "join",
      currentUser.id
    );
  }, [currentUser?.id]);

  // =================================
  // RECEIVE REAL-TIME MESSAGE
  // =================================

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      if (
        Number(data.senderId) ===
        Number(selectedUser?.id)
      ) {
        const newMessage = {
          id: `socket-${Date.now()}-${Math.random()}`,
          message: data.message,
          sender_id: data.senderId,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [
          ...prev,
          newMessage,
        ]);
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

  // =================================
  // LOAD OLD MESSAGES
  // =================================

  useEffect(() => {
    if (!selectedUser || !token) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/messages/${selectedUser.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

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

  // =================================
  // SEND MESSAGE
  // =================================

  const sendMessage = async (text) => {
    if (
      !text.trim() ||
      !selectedUser ||
      !currentUser
    ) {
      return;
    }

    try {
      const response = await fetch(
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

      // Add message to sender screen
      setMessages((prev) => [
        ...prev,
        data.message,
      ]);

      // Send through Socket.IO
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

  // =================================
  // NO USER SELECTED
  // =================================

  if (!selectedUser) {
    return (
      <div className="empty-chat">
        <h2>Select a user</h2>

        <p>
          Choose someone from the sidebar
          to start chatting.
        </p>
      </div>
    );
  }

  // =================================
  // CHAT UI
  // =================================

  return (
    <div className="chat-window">

      {/* =================================
          PERSISTENT REMOTE AUDIO
          IMPORTANT FOR VOICE CALL
      ================================= */}

      <audio
        ref={remoteAudio}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />

      {/* ==============================
          HEADER
      ============================== */}

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

        {/* ==============================
            CALL BUTTONS
        ============================== */}

        <div className="chat-actions">

          {/* VOICE CALL */}

          <button
            onClick={startCall}
            title="Voice call"
            disabled={
              callState !== "idle"
            }
          >
            <FaPhone />
          </button>

          {/* VIDEO CALL */}

          <button
            onClick={() =>
              setVideoCall(true)
            }
            title="Video call"
          >
            <FaVideo />
          </button>

        </div>

      </div>

      {/* ==============================
          MESSAGES
      ============================== */}

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
          messages.map((message) => (
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
          ))
        )}

      </div>

      {/* ==============================
          MESSAGE INPUT
      ============================== */}

      <MessageInput
        onSend={sendMessage}
      />

      {/* ==============================
          VOICE CALL
      ============================== */}

      {callState !== "idle" && (
        <CallModal
          user={
            incomingCall
              ? {
                  name:
                    incomingCall.callerName,

                  avatar:
                    `https://i.pravatar.cc/150?u=${incomingCall.callerId}`,
                }
              : selectedUser
          }

          callState={callState}

          incoming={
            callState === "incoming"
          }

          muted={muted}

          onToggleMute={
            toggleMute
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

      {/* ==============================
          VIDEO CALL
      ============================== */}

      {videoCall && (
        <VideoCall
          user={selectedUser}
          onClose={() =>
            setVideoCall(false)
          }
        />
      )}

    </div>
  );
}

export default ChatWindow;
