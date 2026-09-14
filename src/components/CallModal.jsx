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
  remoteAudio,
}) {
  return (
    <div className="call-overlay">
      <div className="call-card">

        {/* Remote voice audio */}
        <audio
          ref={remoteAudio}
          autoPlay
          playsInline
        />

        <div className="call-status">
          {incoming
            ? "Incoming voice call"
            : callState === "connected"
            ? "Connected"
            : "Calling..."}
        </div>

        <img
          src={user?.avatar}
          alt={user?.name}
        />

        <h2>{user?.name}</h2>

        <p>
          {incoming
            ? "Someone is calling you"
            : callState === "connected"
            ? "Voice call"
            : "Calling..."}
        </p>

        <div className="call-controls">

          {incoming ? (
            <>
              <button
                className="accept-call"
                onClick={onAccept}
              >
                <FiPhone />
              </button>

              <button
                className="end-call"
                onClick={onReject}
              >
                <FiPhoneOff />
              </button>
            </>
          ) : (
            <>
              <button
                className={muted ? "active-control" : ""}
                onClick={onToggleMute}
              >
                {muted ? <FiMicOff /> : <FiMic />}
              </button>

              <button
                className="end-call"
                onClick={onClose}
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
