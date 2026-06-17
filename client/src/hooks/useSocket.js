import { useEffect, useRef, useCallback, useState } from "react";
import { connectSocket, disconnectSocket, joinGroup, leaveGroup, getSocket } from "../services/socket";

/**
 * Hook for connecting to socket and joining a group room.
 * Automatically joins on mount and leaves on unmount.
 * Returns helpers to listen for events.
 */
export function useSocket(groupId) {
  const [toasts, setToasts] = useState([]);
  const listenersRef = useRef([]);

  useEffect(() => {
    const socket = connectSocket();

    if (groupId) {
      joinGroup(groupId);
    }

    return () => {
      if (groupId) {
        leaveGroup(groupId);
      }
      // Clean up listeners
      listenersRef.current.forEach(({ event, handler }) => {
        socket?.off(event, handler);
      });
      listenersRef.current = [];
    };
  }, [groupId]);

  /**
   * Subscribe to a socket event. Automatically cleans up.
   */
  const on = useCallback((event, handler) => {
    const socket = getSocket();
    if (socket) {
      socket.on(event, handler);
      listenersRef.current.push({ event, handler });
    }
  }, []);

  /**
   * Add a toast notification
   */
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { on, toasts, addToast, removeToast };
}
