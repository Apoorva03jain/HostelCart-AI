import { useMemo } from "react";
import { Card } from "../../shared/Card";
import { Button } from "../../shared/Button";
import { Badge } from "../../shared/Badge";
import { suggestThresholdItems } from "../../../services/aiService";
import { formatCurrency } from "../../../utils/formatters";

export function ThresholdSuggestions({ remaining, cartItems = [], onAddItem, disabled = false }) {
  const suggestions = useMemo(
    () => suggestThresholdItems(remaining, cartItems),
    [remaining, cartItems]
  );

  if (remaining <= 0 || suggestions.length === 0) return null;

  return (
    <Card title="🎯 Reach Free Delivery">
      <p className="text-xs text-gray-500 mb-3">
        Add {formatCurrency(remaining)} more to avoid delivery charges
      </p>
      <div className="space-y-2">
        {suggestions.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between bg-green-50/50 rounded-lg px-3 py-2">
            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
            <div className="flex items-center gap-2">
              <Badge variant="success">{formatCurrency(item.price)}</Badge>
              {onAddItem && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onAddItem(item)}
                  disabled={disabled}
                >
                  + Add
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
