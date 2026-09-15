import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhoneOff,
} from "react-icons/fi";

import { useEffect, useRef } from "react";

function VideoCall({
  user,
  callState,
  incoming,
  localStream,
  remoteStream,
  muted,
  camera,
  onToggleMute,
  onToggleCamera,
  onAccept,
  onReject,
  onClose,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ===============================
  // LOCAL VIDEO
  // ===============================

  useEffect(() => {
    if (!localVideoRef.current) return;

    if (localStream) {
      localVideoRef.current.srcObject =
        localStream;

      localVideoRef.current
        .play()
        .catch((error) => {
          console.log(
            "Local video play error:",
            error
          );
        });
    }
  }, [localStream]);

  // ===============================
  // REMOTE VIDEO + AUDIO
  // ===============================

  useEffect(() => {
    if (!remoteVideoRef.current) return;

    if (remoteStream) {
      console.log(
        "Attaching remote stream:",
        remoteStream
      );

      remoteVideoRef.current.srcObject =
        remoteStream;

      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1;

      remoteVideoRef.current
        .play()
        .then(() => {
          console.log(
            "Remote video/audio started"
          );
        })
        .catch((error) => {
          console.error(
            "Remote video/audio play error:",
            error
          );
        });
    }
  }, [remoteStream]);

  return (
    <div className="video-overlay">
      <div className="video-call-container">

        {/* ================================= */}
        {/* REMOTE VIDEO */}
        {/* ================================= */}

        <div className="remote-video-wrapper">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              className="remote-video-element"
              autoPlay
              playsInline
              controls={false}
            />
          ) : (
            <div className="remote-placeholder">
              <div className="remote-avatar">
                <img
                  src={
                    user?.avatar ||
                    `https://i.pravatar.cc/150?u=${user?.id}`
                  }
                  alt={user?.name}
                />
              </div>

              <h2>
                {incoming
                  ? `${user?.name} is calling`
                  : user?.name}
              </h2>

              <p>
                {incoming
                  ? "Incoming video call"
                  : callState === "calling"
                  ? "Calling..."
                  : "Connecting..."}
              </p>
            </div>
          )}

          {/* Remote name */}

          <div className="remote-user-name">
            {user?.name}
          </div>

          {/* Connection status */}

          {!incoming &&
            callState !== "connected" && (
              <div className="video-connecting">
                <span className="connecting-dot"></span>
                {callState === "calling"
                  ? "Calling..."
                  : "Connecting..."}
              </div>
            )}
        </div>

        {/* ================================= */}
        {/* LOCAL VIDEO */}
        {/* ================================= */}

        {!incoming && (
          <div className="local-video-wrapper">
            {camera && localStream ? (
              <video
                ref={localVideoRef}
                className="local-video-element"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="local-camera-off">
                <FiVideoOff />
                <span>Camera off</span>
              </div>
            )}

            <div className="local-name">
              You
            </div>
          </div>
        )}

        {/* ================================= */}
        {/* INCOMING CALL */}
        {/* ================================= */}

        {incoming && (
          <div className="incoming-video-actions">

            <button
              className="accept-video"
              onClick={onAccept}
              title="Accept video call"
            >
              <FiVideo />
            </button>

            <button
              className="reject-video"
              onClick={onReject}
              title="Reject video call"
            >
              <FiPhoneOff />
            </button>

          </div>
        )}

        {/* ================================= */}
        {/* CONTROLS */}
        {/* ================================= */}

        {!incoming && (
          <div className="video-controls">

            {/* MUTE */}

            <button
              className={
                muted
                  ? "video-control active"
                  : "video-control"
              }
              onClick={onToggleMute}
              title={
                muted
                  ? "Unmute microphone"
                  : "Mute microphone"
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

            {/* END */}

            <button
              className="video-control end-video"
              onClick={onClose}
              title="End call"
            >
              <FiPhoneOff />
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

export default VideoCall;