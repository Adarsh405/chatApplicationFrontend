import { useEffect, useRef, useState } from "react";
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

  // =================================
  // AUTO SCROLL REF
  // =================================

  const messagesEndRef = useRef(null);

  // =================================
  // MESSAGE NOTIFICATION SOUND
  // =================================

  const messageSound = useRef(null);

  useEffect(() => {
    messageSound.current = new Audio(
      "/sounds/message.mp3"
    );

    messageSound.current.volume = 0.7;
  }, []);

  const playMessageSound = () => {
    if (!messageSound.current) return;

    messageSound.current.currentTime = 0;

    messageSound.current
      .play()
      .catch((error) => {
        console.log(
          "Message notification blocked:",
          error
        );
      });
  };

  // =================================
  // CURRENT USER
  // =================================

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

    console.log(
      "Joined socket room:",
      currentUser.id
    );
  }, [currentUser?.id]);

  // =================================
  // AUTO SCROLL FUNCTION
  // =================================

  const scrollToBottom = (
    smooth = true
  ) => {
    if (!messagesEndRef.current) return;

    messagesEndRef.current.scrollIntoView({
      behavior: smooth
        ? "smooth"
        : "auto",
      block: "end",
    });
  };

  // =================================
  // AUTO SCROLL WHEN MESSAGES CHANGE
  // =================================

  useEffect(() => {
    if (messages.length === 0) return;

    // Small delay allows DOM to update first
    setTimeout(() => {
      scrollToBottom(true);
    }, 50);
  }, [messages]);

  // =================================
  // RECEIVE REAL-TIME MESSAGE
  // =================================

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      console.log(
        "Received message:",
        data
      );

      // Ignore messages from current user
      if (
        Number(data.senderId) ===
        Number(currentUser?.id)
      ) {
        return;
      }

      // Only add message to currently
      // selected conversation
      if (
        Number(data.senderId) !==
        Number(selectedUser?.id)
      ) {
        return;
      }

      const newMessage = {
        id: `socket-${Date.now()}-${Math.random()}`,

        message:
          data.message,

        sender_id:
          data.senderId,

        created_at:
          new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev,
        newMessage,
      ]);

      // Play notification
      playMessageSound();

      // Scroll to new message
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

        // Scroll after loading old messages
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

    const messageText =
      text.trim();

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

      // =================================
      // ADD MESSAGE TO OWN SCREEN
      // =================================

      setMessages((prev) => [
        ...prev,
        data.message,
      ]);

      // =================================
      // SOCKET MESSAGE
      // =================================

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

      // =================================
      // SCROLL IMMEDIATELY
      // =================================

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

  // =================================
  // NO USER SELECTED
  // =================================

  if (!selectedUser) {
    return (
      <div className="empty-chat">

        <h2>
          Select a user
        </h2>

        <p>
          Choose someone from the
          sidebar to start chatting.
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
      ================================= */}

      <audio
        ref={remoteAudio}
        autoPlay
        playsInline
        style={{
          display: "none",
        }}
      />

      {/* =================================
          HEADER
      ================================= */}

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

        {/* =================================
            CALL BUTTONS
        ================================= */}

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

      {/* =================================
          MESSAGES
      ================================= */}

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

        {/* =================================
            IMPORTANT SCROLL TARGET
        ================================= */}

        <div
          ref={messagesEndRef}
          style={{
            height: "1px",
          }}
        />

      </div>

      {/* =================================
          MESSAGE INPUT
      ================================= */}

      <MessageInput
        onSend={sendMessage}
      />

      {/* =================================
          VOICE CALL
      ================================= */}

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

          callState={
            callState
          }

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

          remoteAudio={
            remoteAudio
          }
        />

      )}

      {/* =================================
          VIDEO CALL
      ================================= */}

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
