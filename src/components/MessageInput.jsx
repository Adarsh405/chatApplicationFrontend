import { useState } from "react";
import {
  FaSmile,
  FaPaperclip,
  FaPaperPlane,
} from "react-icons/fa";

function MessageInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    onSend(message);
    setMessage("");
  };

  return (
    <form
      className="message-input"
      onSubmit={handleSubmit}
    >
      <button
        type="button"
        className="input-icon"
        title="Emoji"
      >
        <FaSmile />
      </button>

      <button
        type="button"
        className="input-icon"
        title="Attach file"
      >
        <FaPaperclip />
      </button>

      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        type="submit"
        className="send-button"
        title="Send"
      >
        <FaPaperPlane />
      </button>
    </form>
  );
}

export default MessageInput;