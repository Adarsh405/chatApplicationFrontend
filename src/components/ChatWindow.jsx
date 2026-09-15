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
  const avatar =
    user?.avatar ||
    `https://i.pravatar.cc/150?u=${user?.id}`;

  // ========================================
  // INCOMING VIDEO CALL
  // ========================================

  if (incoming) {
    return (
      <div className="video-overlay">
        <div className="video-incoming-card">
          <div className="video-incoming-avatar">
            <div className="incoming-pulse" />

            <img
              src={avatar}
              alt={user?.name}
            />
          </div>

          <div className="video-incoming-label">
            Incoming video call
          </div>

          <h2>{user?.name}</h2>

          <p>
            wants to start a video call
          </p>

          <div className="video-incoming-actions">
            <button
              className="video-accept"
              onClick={onAccept}
              title="Accept video call"
            >
              <FiPhone />
            </button>

            <button
              className="video-reject"
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

  // ========================================
  // ACTIVE VIDEO CALL
  // ========================================

  return (
    <div className="video-overlay">
      <div className="video-call-container">
        {/* ==================================
            REMOTE VIDEO
        ================================== */}

        <video
          ref={remoteVideo}
          className="remote-video-element"
          autoPlay
          playsInline
        />

        {/* ==================================
            FALLBACK
        ================================== */}

        {callState !== "connected" && (
          <div className="video-waiting">
            <div className="video-waiting-avatar">
              <img
                src={avatar}
                alt={user?.name}
              />
            </div>

            <h2>{user?.name}</h2>

            <p>
              {callState === "calling"
                ? "Calling..."
                : "Connecting..."}
            </p>

            <div className="video-loading-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {/* ==================================
            USER NAME
        ================================== */}

        <div className="remote-user-name">
          <span className="online-dot" />
          {user?.name}
        </div>

        {/* ==================================
            LOCAL VIDEO
        ================================== */}

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

          <span className="you-label">
            You
          </span>
        </div>

        {/* ==================================
            CALL STATE
        ================================== */}

        <div className="video-call-state">
          {callState === "calling" &&
            "Calling..."}

          {callState === "connected" &&
            "Connected"}

          {callState !== "calling" &&
            callState !== "connected" &&
            "Connecting..."}
        </div>

        {/* ==================================
            CONTROLS
        ================================== */}

        <div className="video-controls">
          <button
            className={
              muted
                ? "video-control active"
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
                ? "video-control active"
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
            className="video-end-call"
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