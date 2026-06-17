export function ProgressBar({ value = 0, max = 100, label, showMilestones = false }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isComplete = percentage >= 100;

  return (
    <div>
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span className={isComplete ? "text-green-600 font-medium" : ""}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className="relative w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            isComplete ? "bg-green-500" : percentage > 75 ? "bg-indigo-500" : percentage > 50 ? "bg-indigo-400" : "bg-indigo-300"
          }`}
          style={{ width: `${percentage}%` }}
        />
        {showMilestones && (
          <>
            <div className="absolute top-0 left-1/4 w-0.5 h-3 bg-gray-400/50" />
            <div className="absolute top-0 left-1/2 w-0.5 h-3 bg-gray-400/50" />
            <div className="absolute top-0 left-3/4 w-0.5 h-3 bg-gray-400/50" />
          </>
        )}
      </div>
      {showMilestones && (
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}
