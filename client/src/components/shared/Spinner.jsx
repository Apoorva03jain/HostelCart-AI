const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function Spinner({ size = "md" }) {
  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizeStyles[size]}`} />
    </div>
  );
}
