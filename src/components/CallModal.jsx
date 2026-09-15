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

        {/* ============================= */}
        {/* STATUS */}
        {/* ============================= */}

        <div className="call-status">

          {incoming
            ? "Incoming voice call"
            : callState === "connected"
            ? "Connected"
            : "Calling..."}

        </div>

        {/* ============================= */}
        {/* AVATAR */}
        {/* ============================= */}

        <div className="call-avatar-wrapper">

          <div className="call-avatar-ring"></div>

          <img
            src={
              user?.avatar ||
              `https://i.pravatar.cc/150?u=${user?.id}`
            }
            alt={user?.name}
          />

        </div>

        {/* ============================= */}
        {/* NAME */}
        {/* ============================= */}

        <h2>
          {user?.name}
        </h2>

        {/* ============================= */}
        {/* DESCRIPTION */}
        {/* ============================= */}

        <p>

          {incoming
            ? "Someone is calling you"
            : callState === "connected"
            ? "Voice call"
            : "Calling..."}

        </p>

        {/* ============================= */}
        {/* CONTROLS */}
        {/* ============================= */}

        <div className="call-controls">

          {incoming ? (
            <>
              {/* ACCEPT */}

              <button
                className="accept-call"
                onClick={onAccept}
                title="Accept call"
              >
                <FiPhone />
              </button>

              {/* REJECT */}

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
              {/* MUTE */}

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

              {/* END */}

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