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

      <div
        className={`call-card ${
          incoming
            ? "incoming-call-card"
            : ""
        }`}
      >

        {/* =================================
            ANIMATED RINGS
        ================================= */}

        <div className="call-rings">

          <span />
          <span />
          <span />

        </div>

        {/* =================================
            STATUS
        ================================= */}

        <div className="call-status">

          <span className="status-dot" />

          {incoming
            ? "Incoming voice call"
            : callState === "connected"
            ? "Connected"
            : "Calling..."}

        </div>

        {/* =================================
            AVATAR
        ================================= */}

        <div className="call-avatar-wrapper">

          <div className="avatar-glow" />

          <img
            src={
              user?.avatar ||
              `https://i.pravatar.cc/150?u=${user?.id}`
            }
            alt={user?.name}
          />

        </div>

        {/* =================================
            USER NAME
        ================================= */}

        <h2>
          {user?.name}
        </h2>

        <p className="call-description">

          {incoming
            ? "Someone is calling you"
            : callState === "connected"
            ? "Voice call"
            : "Calling..."}

        </p>

        {/* =================================
            CALLING DOTS
        ================================= */}

        {!incoming &&
          callState !== "connected" && (
            <div className="calling-dots">

              <span />
              <span />
              <span />

            </div>
          )}

        {/* =================================
            CONTROLS
        ================================= */}

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
                onClick={
                  onToggleMute
                }
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