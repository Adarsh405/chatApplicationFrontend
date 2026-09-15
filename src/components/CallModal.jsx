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

        {/* Call Status */}
        <div className="call-status">
          {incoming
            ? "Incoming voice call"
            : callState === "connected"
            ? "Connected"
            : "Calling..."}
        </div>

        {/* Avatar */}
        <div className="call-avatar-wrapper">
          <img
            src={avatar}
            alt={user?.name || "User"}
            className="call-avatar"
            onError={(e) => {
              e.currentTarget.src =
                "https://i.pravatar.cc/150";
            }}
          />
        </div>

        {/* User Name */}
        <h2>
          {user?.name || "Unknown"}
        </h2>

        {/* Description */}
        <p>
          {incoming
            ? "Someone is calling you"
            : callState === "connected"
            ? "Voice call connected"
            : "Calling..."}
        </p>

        {/* Controls */}
        <div className="call-controls">
          {incoming ? (
            <>
              {/* Accept */}
              <button
                className="accept-call"
                onClick={onAccept}
                title="Accept call"
                type="button"
              >
                <FiPhone />
              </button>

              {/* Reject */}
              <button
                className="end-call"
                onClick={onReject}
                title="Reject call"
                type="button"
              >
                <FiPhoneOff />
              </button>
            </>
          ) : (
            <>
              {/* Mute / Unmute */}
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
                type="button"
              >
                {muted ? (
                  <FiMicOff />
                ) : (
                  <FiMic />
                )}
              </button>

              {/* End Call */}
              <button
                className="end-call"
                onClick={onClose}
                title="End call"
                type="button"
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