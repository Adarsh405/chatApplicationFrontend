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
  return (
    <div className="video-call-overlay">

      {/* =================================
          REMOTE VIDEO
      ================================= */}

      <video
        ref={remoteVideo}
        className="remote-video"
        autoPlay
        playsInline
      />

      {/* =================================
          FALLBACK / CALLING BACKGROUND
      ================================= */}

      {callState !== "connected" && (
        <div className="video-waiting-screen">

          <div className="video-ring-container">

            <div className="video-ring ring-one" />
            <div className="video-ring ring-two" />
            <div className="video-ring ring-three" />

            <img
              src={
                user?.avatar ||
                `https://i.pravatar.cc/150?u=${user?.id}`
              }
              alt={user?.name}
            />

          </div>

          <h2>
            {user?.name}
          </h2>

          <p>
            {incoming
              ? "Incoming video call"
              : "Calling..."}
          </p>

          {!incoming && (
            <div className="calling-dots">
              <span />
              <span />
              <span />
            </div>
          )}

        </div>
      )}

      {/* =================================
          USER INFORMATION
      ================================= */}

      <div className="video-user-info">

        <div className="video-status-dot" />

        <div>
          <h3>
            {user?.name}
          </h3>

          <p>
            {incoming
              ? "Incoming video call"
              : callState === "connected"
              ? "Connected"
              : "Calling..."}
          </p>
        </div>

      </div>

      {/* =================================
          LOCAL VIDEO
      ================================= */}

      <div className="local-video-wrapper">

        <video
          ref={localVideo}
          className="local-video"
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

        <div className="you-label">
          You
        </div>

      </div>

      {/* =================================
          INCOMING CALL
      ================================= */}

      {incoming ? (
        <div className="video-incoming-controls">

          <div className="incoming-label">
            <span className="incoming-pulse" />
            Incoming call
          </div>

          <div className="incoming-buttons">

            <button
              className="accept-call"
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
      ) : (
        <div className="video-controls">

          {/* MUTE */}

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

          {/* CAMERA */}

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

          {/* END */}

          <button
            className="end-call"
            onClick={onClose}
            title="End call"
          >
            <FiPhoneOff />
          </button>

        </div>
      )}

    </div>
  );
}

export default VideoCall;