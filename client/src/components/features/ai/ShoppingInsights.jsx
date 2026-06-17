import { useMemo } from "react";
import { Card } from "../../shared/Card";
import { Badge } from "../../shared/Badge";
import { MetricCard } from "../../shared/MetricCard";
import { generateShoppingInsights } from "../../../services/aiService";
import { formatCurrency } from "../../../utils/formatters";

export function ShoppingInsights({ group }) {
  const insights = useMemo(() => generateShoppingInsights(group), [group]);

  if (!insights) return null;

  return (
    <Card title="📊 Shopping Insights">
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Products" value={insights.totalProducts} icon="🛍️" color="indigo" />
        <MetricCard label="Quantity" value={insights.totalQuantity} icon="📦" color="blue" />
        <MetricCard label="Avg Order" value={formatCurrency(insights.avgOrderValue)} icon="📈" color="green" />
        <MetricCard label="Top Spender" value={insights.highestSpender.name} icon="👑" color="yellow" />
      </div>

      {/* Most Ordered */}
      {insights.mostOrdered.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Most Ordered Items</h4>
          <div className="flex flex-wrap gap-2">
            {insights.mostOrdered.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-gray-50 rounded-full px-3 py-1">
                <span className="text-sm text-gray-700">{item.name}</span>
                <Badge variant="info">×{item.totalQty}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
