import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

let socket = null;

/**
 * Connect to the Socket.IO server
 */
export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected");
  });

  return socket;
};

/**
 * Disconnect from the Socket.IO server
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Join a group room for real-time updates
 */
export const joinGroup = (groupId) => {
  if (socket?.connected) {
    socket.emit("join-group", groupId);
  }
};

/**
 * Leave a group room
 */
export const leaveGroup = (groupId) => {
  if (socket?.connected) {
    socket.emit("leave-group", groupId);
  }
};

/**
 * Get the current socket instance
 */
export const getSocket = () => socket;

export default {
  connectSocket,
  disconnectSocket,
  joinGroup,
  leaveGroup,
  getSocket,
};
