import { useMemo } from "react";
import { Card } from "../../shared/Card";
import { Button } from "../../shared/Button";
import { Badge } from "../../shared/Badge";
import { suggestMissingItems } from "../../../services/aiService";
import { formatCurrency } from "../../../utils/formatters";

export function SuggestionPanel({ cartItems = [], onAddItem, disabled = false }) {
  const suggestions = useMemo(() => suggestMissingItems(cartItems), [cartItems]);

  if (suggestions.length === 0) return null;

  return (
    <Card title="💡 Suggested Items">
      <p className="text-xs text-gray-500 mb-3">Based on your cart contents</p>
      <div className="space-y-2">
        {suggestions.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between bg-indigo-50/50 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.productName}</p>
              <p className="text-xs text-gray-500">{item.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">{formatCurrency(item.price)}</Badge>
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
