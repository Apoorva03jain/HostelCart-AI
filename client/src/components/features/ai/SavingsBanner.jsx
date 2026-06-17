import { useMemo } from "react";
import { calculateSavingsOpportunity } from "../../../services/aiService";
import { formatCurrency } from "../../../utils/formatters";

export function SavingsBanner({ group, summary }) {
  const savings = useMemo(
    () => calculateSavingsOpportunity(group, summary),
    [group, summary]
  );

  if (!savings) return null;

  const colors = {
    high: "bg-green-50 border-green-200 text-green-800",
    medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
    low: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[savings.urgency]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">💸</span>
        <div>
          <p className="font-medium text-sm">{savings.message}</p>
          <p className="text-xs opacity-75 mt-1">
            Only {formatCurrency(savings.remaining)} away from free delivery
          </p>
        </div>
      </div>
    </div>
  );
}
