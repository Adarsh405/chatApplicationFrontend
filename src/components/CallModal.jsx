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
  return (
    <div className="call-overlay">
      <div className="call-card">

        <div className="call-status">
          {incoming
            ? "Incoming voice call"
            : callState === "connected"
            ? "Connected"
            : "Calling..."}
        </div>

        <div className="call-avatar-wrapper">
          <img
            src={
              user?.avatar ||
              `https://i.pravatar.cc/150?u=${user?.id}`
            }
            alt={user?.name || "User"}
            className="call-avatar"
          />
        </div>

        <h2>
          {user?.name || "Unknown"}
        </h2>

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