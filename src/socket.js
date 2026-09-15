import { io } from "socket.io-client";

const socket = io(
  import.meta.env.VITE_API_URL,
  {
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 20000,
  }
);

socket.on("connect", () => {
  console.log(
    "Socket connected:",
    socket.id
  );
});

socket.on("disconnect", (reason) => {
  console.log(
    "Socket disconnected:",
    reason
  );
});

socket.on("connect_error", (error) => {
  console.error(
    "Socket connection error:",
    error.message
  );
});

export default socket;