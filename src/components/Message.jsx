function Message({ message, isOwn }) {
  return (
    <div className={`message-row ${isOwn ? "message-own" : "message-other"}`}>
      <div className={`message-content ${isOwn ? "content-own" : ""}`}>
        
        <div className={`message-bubble ${isOwn ? "bubble-own" : "bubble-other"}`}>
          <p>{message.message}</p>

          <div className="message-meta">
            <span>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {isOwn && <span className="message-check">✓✓</span>}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Message;