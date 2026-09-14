import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiPhoneOff,
} from "react-icons/fi";

import { useState } from "react";

function VideoCall({ user, onClose }) {
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);

  return (
    <div className="video-overlay">
      <div className="remote-video">
        <img src={user.avatar} alt={user.name} />

        <div className="video-name">
          {user.name}
        </div>

        <div className="self-video">
          <div>You</div>
        </div>

        <div className="video-controls">
          <button onClick={() => setMuted(!muted)}>
            {muted ? <FiMicOff /> : <FiMic />}
          </button>

          <button onClick={() => setCamera(!camera)}>
            {camera ? <FiVideo /> : <FiVideoOff />}
          </button>

          <button className="end-call" onClick={onClose}>
            <FiPhoneOff />
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;