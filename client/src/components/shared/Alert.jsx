const typeStyles = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

export function Alert({ type = "info", message, onClose }) {
  if (!message) return null;

  return (
    <div className={`rounded-md border p-4 mb-4 ${typeStyles[type]}`}>
      <div className="flex justify-between items-center">
        <p className="text-sm">{message}</p>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-current opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
