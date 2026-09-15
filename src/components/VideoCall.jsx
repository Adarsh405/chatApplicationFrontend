import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaPhone,
} from "react-icons/fa";

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
  const isConnected =
    callState === "connected";

  const isCalling =
    callState === "calling";

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>

        {/* =================================
            REMOTE VIDEO
        ================================= */}

        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          style={styles.remoteVideo}
        />

        {/* =================================
            FALLBACK
        ================================= */}

        {!isConnected && (
          <div style={styles.waiting}>
            <div style={styles.avatar}>
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || "?"}
            </div>

            <h2>
              {incoming
                ? user?.name
                : isCalling
                ? `Calling ${user?.name}...`
                : user?.name}
            </h2>

            <p>
              {incoming
                ? "Incoming video call"
                : isCalling
                ? "Waiting for answer..."
                : ""}
            </p>
          </div>
        )}

        {/* =================================
            LOCAL VIDEO
        ================================= */}

        <video
          ref={localVideo}
          autoPlay
          muted
          playsInline
          style={styles.localVideo}
        />

        {/* =================================
            HEADER
        ================================= */}

        <div style={styles.header}>
          <div>
            <strong>
              {user?.name || "Video Call"}
            </strong>

            <span style={styles.status}>
              {callState === "connected"
                ? "Connected"
                : callState === "calling"
                ? "Calling..."
                : "Incoming call"}
            </span>
          </div>
        </div>

        {/* =================================
            INCOMING CALL
        ================================= */}

        {incoming && (
          <div style={styles.incomingButtons}>
            <button
              onClick={onReject}
              style={{
                ...styles.callButton,
                ...styles.reject,
              }}
            >
              <FaPhoneSlash />
            </button>

            <button
              onClick={onAccept}
              style={{
                ...styles.callButton,
                ...styles.accept,
              }}
            >
              <FaPhone />
            </button>
          </div>
        )}

        {/* =================================
            CALL CONTROLS
        ================================= */}

        {!incoming &&
          callState !== "idle" && (
            <div style={styles.controls}>

              <button
                onClick={onToggleMute}
                style={styles.controlButton}
                title={
                  muted
                    ? "Unmute"
                    : "Mute"
                }
              >
                {muted ? (
                  <FaMicrophoneSlash />
                ) : (
                  <FaMicrophone />
                )}
              </button>

              <button
                onClick={onToggleCamera}
                style={styles.controlButton}
                title={
                  camera
                    ? "Turn camera off"
                    : "Turn camera on"
                }
              >
                {camera ? (
                  <FaVideo />
                ) : (
                  <FaVideoSlash />
                )}
              </button>

              <button
                onClick={onClose}
                style={{
                  ...styles.controlButton,
                  ...styles.end,
                }}
                title="End call"
              >
                <FaPhoneSlash />
              </button>

            </div>
          )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background:
      "rgba(0, 0, 0, 0.92)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  container: {
    position: "relative",
    width: "100%",
    height: "100%",
    maxWidth: "1200px",
    overflow: "hidden",
    background: "#111",
  },

  remoteVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    background: "#111",
  },

  localVideo: {
    position: "absolute",
    right: "25px",
    top: "25px",
    width: "220px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "14px",
    border: "2px solid rgba(255,255,255,0.5)",
    background: "#222",
    zIndex: 3,
  },

  waiting: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },

  avatar: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "#333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
    fontWeight: "bold",
    marginBottom: "20px",
  },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: "25px",
    color: "white",
    zIndex: 4,
    background:
      "linear-gradient(rgba(0,0,0,.7), transparent)",
  },

  status: {
    display: "block",
    fontSize: "13px",
    opacity: 0.7,
    marginTop: "5px",
  },

  controls: {
    position: "absolute",
    bottom: "35px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "15px",
    zIndex: 5,
  },

  controlButton: {
    width: "55px",
    height: "55px",
    border: "none",
    borderRadius: "50%",
    background: "#292929",
    color: "white",
    cursor: "pointer",
    fontSize: "19px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  end: {
    background: "#e53935",
  },

  incomingButtons: {
    position: "absolute",
    bottom: "70px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "35px",
    zIndex: 5,
  },

  callButton: {
    width: "65px",
    height: "65px",
    border: "none",
    borderRadius: "50%",
    color: "white",
    cursor: "pointer",
    fontSize: "23px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  reject: {
    background: "#e53935",
  },

  accept: {
    background: "#22c55e",
  },
};

export default VideoCall;