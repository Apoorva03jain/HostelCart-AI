import { useMemo, useState } from "react";
import { Card } from "../../shared/Card";
import { Button } from "../../shared/Button";
import { Badge } from "../../shared/Badge";
import { Modal } from "../../shared/Modal";
import { getOrderTemplates } from "../../../services/aiService";
import { formatCurrency } from "../../../utils/formatters";

export function OrderTemplates({ onApplyTemplate, disabled = false }) {
  const templates = useMemo(() => getOrderTemplates(), []);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleApply = () => {
    if (selectedTemplate && onApplyTemplate) {
      onApplyTemplate(selectedTemplate.items);
      setSelectedTemplate(null);
    }
  };

  return (
    <>
      <Card title="📋 Quick Order Templates">
        <p className="text-xs text-gray-500 mb-3">One-click templates for common orders</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((template) => (
            <div
              key={template.name}
              className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition cursor-pointer"
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{template.icon}</span>
                <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
              </div>
              <p className="text-xs text-gray-500">{template.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="info">{template.items.length} items</Badge>
                <span className="text-xs font-medium text-indigo-600">{formatCurrency(template.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Template Detail Modal */}
      <Modal
        isOpen={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        title={selectedTemplate ? `${selectedTemplate.icon} ${selectedTemplate.name}` : ""}
      >
        {selectedTemplate && (
          <div>
            <p className="text-sm text-gray-500 mb-4">{selectedTemplate.description}</p>
            <div className="space-y-2 mb-4">
              {selectedTemplate.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                  <span>{item.productName} × {item.quantity}</span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center border-t pt-3 mb-4">
              <span className="font-medium">Total</span>
              <span className="font-bold text-indigo-600">{formatCurrency(selectedTemplate.total)}</span>
            </div>
            <Button className="w-full" onClick={handleApply} disabled={disabled}>
              Add All Items to Cart
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
