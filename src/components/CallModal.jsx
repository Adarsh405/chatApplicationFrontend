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

        {/* =================================
            CALL STATUS
        ================================= */}

        <div className="call-status">

          {incoming
            ? "Incoming voice call"
            : callState ===
              "connected"
            ? "Connected"
            : "Calling..."}

        </div>

        {/* =================================
            USER AVATAR
        ================================= */}

        <img
          src={user?.avatar}
          alt={user?.name}
        />

        <h2>
          {user?.name}
        </h2>

        <p>

          {incoming
            ? "Someone is calling you"
            : callState ===
              "connected"
            ? "Voice call"
            : "Calling..."}

        </p>

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
