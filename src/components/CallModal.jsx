import {
  FiMic,
  FiMicOff,
  FiPhoneOff,
  FiPhone,
} from "react-icons/fi";

function CallModal({
  user,
  onClose,
  muted,
  onToggleMute,
  callState,
  incoming,
  onAccept,
  onReject,
}) {
  const avatar =
    user?.avatar ||
    `https://i.pravatar.cc/150?u=${user?.id}`;

  return (
    <div className="call-overlay">
      <div className="call-card">
        <div className="call-pulse">
          <div className="call-ring ring-one" />
          <div className="call-ring ring-two" />

          <img
            src={avatar}
            alt={user?.name}
          />
        </div>

        <div className="call-status">
          {incoming
            ? "Incoming voice call"
            : callState === "connected"
            ? "Connected"
            : "Calling..."}
        </div>

        <h2>{user?.name}</h2>

        <p>
          {incoming
            ? "Someone is calling you"
            : callState === "connected"
            ? "Voice call connected"
            : "Calling..."}
        </p>

        <div className="call-controls">
          {incoming ? (
            <>
              <button
                className="accept-call"
                onClick={onAccept}
                title="Accept call"
              >
                <FiPhone />
              </button>

              <button
                className="end-call"
                onClick={onReject}
                title="Reject call"
              >
                <FiPhoneOff />
              </button>
            </>
          ) : (
            <>
              <button
                className={
                  muted
                    ? "active-control"
                    : ""
                }
                onClick={onToggleMute}
                title={
                  muted
                    ? "Unmute"
                    : "Mute"
                }
              >
                {muted ? (
                  <FiMicOff />
                ) : (
                  <FiMic />
                )}
              </button>

              <button
                className="end-call"
                onClick={onClose}
                title="End call"
              >
                <FiPhoneOff />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallModal;