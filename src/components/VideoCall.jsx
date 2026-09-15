import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhoneOff,
  FiPhone,
} from "react-icons/fi";

function VideoCall({
  user,
  callState,
  incoming,
  muted,
  camera,
  remoteVideo,
  localVideo,
  onAccept,
  onReject,
  onToggleMute,
  onToggleCamera,
  onClose,
}) {
  // ==================================================
  // INCOMING SCREEN
  // ==================================================

  if (incoming) {
    return (
      <div className="video-overlay">
        <div className="video-incoming-card">

          <div className="video-incoming-ring">
            <img
              src={
                user?.avatar ||
                `https://i.pravatar.cc/150?u=${user?.id}`
              }
              alt={user?.name || "User"}
            />
          </div>

          <h2>
            {user?.name || "Unknown"}
          </h2>

          <p>
            Incoming video call...
          </p>

          <div className="video-incoming-controls">

            <button
              className="accept-video"
              onClick={onAccept}
              title="Accept video call"
            >
              <FiPhone />
            </button>

            <button
              className="end-call"
              onClick={onReject}
              title="Reject video call"
            >
              <FiPhoneOff />
            </button>

          </div>
        </div>
      </div>
    );
  }

  // ==================================================
  // ACTIVE / OUTGOING VIDEO CALL
  // ==================================================

  return (
    <div className="video-overlay">

      <div className="video-stage">

        {/* ==========================================
            REMOTE VIDEO
        ========================================== */}

        <video
          ref={remoteVideo}
          className="remote-video-element"
          autoPlay
          playsInline
        />

        {/* ==========================================
            REMOTE PLACEHOLDER
        ========================================== */}

        <div className="remote-placeholder">
          <div className="remote-placeholder-avatar">
            <img
              src={
                user?.avatar ||
                `https://i.pravatar.cc/150?u=${user?.id}`
              }
              alt={user?.name || "User"}
            />
          </div>

          <h2>
            {user?.name || "Unknown"}
          </h2>

          <p>
            {callState === "connected"
              ? "Video call connected"
              : "Calling..."}
          </p>
        </div>

        {/* ==========================================
            USER NAME
        ========================================== */}

        <div className="video-name">
          {user?.name || "Unknown"}
        </div>

        {/* ==========================================
            LOCAL VIDEO
        ========================================== */}

        <div className="local-video-container">

          <video
            ref={localVideo}
            className="local-video-element"
            autoPlay
            muted
            playsInline
          />

          {!camera && (
            <div className="camera-off-overlay">
              <FiVideoOff />
              <span>Camera off</span>
            </div>
          )}

          <span className="local-video-label">
            You
          </span>

        </div>

        {/* ==========================================
            CALL STATUS
        ========================================== */}

        <div className="video-call-status">
          {callState === "connected"
            ? "Connected"
            : "Calling..."}
        </div>

        {/* ==========================================
            CONTROLS
        ========================================== */}

        <div className="video-controls">

          <button
            className={
              muted
                ? "video-control active-control"
                : "video-control"
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
            className={
              !camera
                ? "video-control active-control"
                : "video-control"
            }
            onClick={onToggleCamera}
            title={
              camera
                ? "Turn camera off"
                : "Turn camera on"
            }
          >
            {camera ? (
              <FiVideo />
            ) : (
              <FiVideoOff />
            )}
          </button>

          <button
            className="video-control end-call"
            onClick={onClose}
            title="End call"
          >
            <FiPhoneOff />
          </button>

        </div>

      </div>
    </div>
  );
}

export default VideoCall;