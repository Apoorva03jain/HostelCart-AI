import { useState, useEffect } from "react";

const typeStyles = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-indigo-600 text-white",
  warning: "bg-yellow-500 text-white",
};

export function Toast({ message, type = "info", duration = 4000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible || !message) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${typeStyles[type]}`}>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={() => { setVisible(false); onClose?.(); }}
        className="opacity-70 hover:opacity-100 transition"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * ToastContainer manages multiple toast messages
 */
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${typeStyles[toast.type || "info"]}`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-70 hover:opacity-100 transition"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
