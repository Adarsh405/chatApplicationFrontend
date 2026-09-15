import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhoneOff,
} from "react-icons/fi";

import { useState } from "react";

function VideoCall({
  user,
  onClose,
}) {
  const [muted, setMuted] =
    useState(false);

  const [camera, setCamera] =
    useState(true);

  return (
    <div className="video-overlay">

      <div className="remote-video">

        {/* =================================
            REMOTE USER
        ================================= */}

        <img
          src={
            user?.avatar ||
            `https://i.pravatar.cc/150?u=${user?.id}`
          }
          alt={user?.name}
        />

        <div className="video-name">
          {user?.name}
        </div>

        {/* =================================
            YOUR VIDEO
        ================================= */}

        <div className="self-video">

          <div>
            You
          </div>

        </div>

        {/* =================================
            CONTROLS
        ================================= */}

        <div className="video-controls">

          {/* MIC */}

          <button
            onClick={() =>
              setMuted(
                (previous) =>
                  !previous
              )
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

          {/* CAMERA */}

          <button
            onClick={() =>
              setCamera(
                (previous) =>
                  !previous
              )
            }
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

      </div>

    </div>
  );
}

export default VideoCall;
