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
  // ==========================================
  // INCOMING CALL
  // ==========================================

  if (incoming) {
    return (
      <div className="video-overlay">
        <div className="video-incoming-card">
          <div className="video-incoming-label">
            Incoming video call
          </div>

          <img
            src={
              user?.avatar ||
              `https://i.pravatar.cc/150?u=${user?.id}`
            }
            alt={user?.name}
          />

          <h2>{user?.name}</h2>

          <p>is calling you...</p>

          <div className="video-incoming-controls">
            <button
              className="video-accept"
              onClick={onAccept}
              title="Accept"
            >
              <FiPhone />
            </button>

            <button
              className="end-call"
              onClick={onReject}
              title="Reject"
            >
              <FiPhoneOff />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ACTIVE CALL
  // ==========================================

  return (
    <div className="video-overlay">
      <div className="video-stage">
        {/* REMOTE VIDEO */}

        <video
          ref={remoteVideo}
          className="remote-video-element"
          autoPlay
          playsInline
        />

        {/* Remote placeholder while connecting */}

        {callState !== "connected" && (
          <div className="video-connecting">
            <img
              src={
                user?.avatar ||
                `https://i.pravatar.cc/150?u=${user?.id}`
              }
              alt={user?.name}
            />

            <h2>{user?.name}</h2>

            <p>
              {callState === "calling"
                ? "Calling..."
                : "Connecting..."}
            </p>
          </div>
        )}

        {/* USER NAME */}

        <div className="video-user-name">
          {user?.name}
        </div>

        {/* LOCAL VIDEO */}

        <div className="local-video-container">
          <video
            ref={localVideo}
            className="local-video-element"
            autoPlay
            muted
            playsInline
          />

          {!camera && (
            <div className="camera-off">
              <FiVideoOff />
              <span>Camera off</span>
            </div>
          )}

          <div className="you-label">
            You
          </div>
        </div>

        {/* STATUS */}

        <div className="video-call-status">
          {callState === "calling"
            ? "Calling..."
            : callState === "connected"
            ? "Connected"
            : "Connecting..."}
        </div>

        {/* CONTROLS */}

        <div className="video-controls">
          <button
            className={
              muted
                ? "active-control"
                : ""
            }
            onClick={onToggleMute}
            title={
              muted ? "Unmute" : "Mute"
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
                ? "active-control"
                : ""
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
            className="end-call"
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