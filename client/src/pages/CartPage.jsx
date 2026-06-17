import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { Card } from "../components/shared/Card";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Alert } from "../components/shared/Alert";
import { Spinner } from "../components/shared/Spinner";
import { Badge } from "../components/shared/Badge";
import { Modal } from "../components/shared/Modal";
import { ToastContainer } from "../components/shared/Toast";
import { EmptyState } from "../components/shared/EmptyState";
import { SuggestionPanel } from "../components/features/ai/SuggestionPanel";
import { ThresholdSuggestions } from "../components/features/ai/ThresholdSuggestions";
import { OrderTemplates } from "../components/features/ai/OrderTemplates";
import { SavingsBanner } from "../components/features/ai/SavingsBanner";
import { formatCurrency } from "../utils/formatters";
import api from "../services/api";

export function CartPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { on, toasts, addToast, removeToast } = useSocket(id);
  const [group, setGroup] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({ productName: "", productLink: "", quantity: "", price: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ quantity: "", price: "" });
  const [showPayModal, setShowPayModal] = useState(false);

  useEffect(() => { fetchCart(); }, [id]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    on("payment-verified", (data) => {
      if (data.email?.toLowerCase() === user?.email?.toLowerCase()) {
        addToast("Your payment has been verified! Cart is now locked.", "success");
      }
      fetchCart();
    });
    on("group-closed", () => {
      addToast("Group has been closed!", "warning");
      fetchCart();
    });
    on("cart-item-added", () => fetchCart());
    on("cart-item-updated", () => fetchCart());
    on("cart-item-removed", () => fetchCart());
    on("payment-details-updated", () => fetchCart());
  }, [on, addToast, user]);

  const fetchCart = async () => {
    try {
      const { data } = await api.get("/groups");
      const found = data.find((g) => g._id === id);
      setGroup(found);
      if (found) {
        const me = found.members.find((m) => m.email.toLowerCase() === user?.email?.toLowerCase());
        setMember(me || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = member?.paymentVerified || group?.isClosed;

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setAddLoading(true);
    try {
      const { data } = await api.post(`/groups/${id}/cart/add`, {
        productName: form.productName,
        productLink: form.productLink || undefined,
        quantity: Number(form.quantity),
        price: Number(form.price),
      });
      setMember(data.member);
      setForm({ productName: "", productLink: "", quantity: "", price: "" });
      setSuccess(data.message);
      if (data.autoClosed) {
        setGroup((prev) => prev ? { ...prev, isClosed: true } : prev);
      }
      fetchCart();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add item");
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (itemId) => {
    setError(""); setSuccess("");
    try {
      const payload = { itemId };
      if (editForm.quantity) payload.quantity = Number(editForm.quantity);
      if (editForm.price) payload.price = Number(editForm.price);
      const { data } = await api.put(`/groups/${id}/cart/edit`, payload);
      setMember(data.member);
      setEditingItem(null);
      setSuccess(data.message);
      fetchCart();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit item");
    }
  };

  const handleRemove = async (itemId) => {
    setError(""); setSuccess("");
    try {
      const { data } = await api.delete(`/groups/${id}/cart/remove`, { data: { itemId } });
      setMember(data.member);
      setSuccess(data.message);
      fetchCart();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove item");
    }
  };

  const handlePay = async () => {
    setError(""); setSuccess("");
    try {
      await api.post(`/groups/${id}/pay`, { email: user.email });
      setSuccess("Payment marked successfully");
      fetchCart();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark payment");
    }
  };

  const handleAddAISuggestion = async (item) => {
    setError(""); setSuccess("");
    try {
      const { data } = await api.post(`/groups/${id}/cart/add`, {
        productName: item.productName,
        quantity: 1,
        price: item.price,
      });
      setMember(data.member);
      setSuccess(`Added ${item.productName} to cart`);
      fetchCart();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add item");
    }
  };

  const handleApplyTemplate = async (items) => {
    setError(""); setSuccess("");
    try {
      for (const item of items) {
        await api.post(`/groups/${id}/cart/add`, {
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        });
      }
      setSuccess(`Template applied! ${items.length} items added.`);
      fetchCart();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to apply template");
    }
  };

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h1 className="text-2xl font-bold text-gray-900">My Cart</h1>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-medium text-amber-900 text-sm">Cart Locked</p>
              <p className="text-xs text-amber-700 mt-1">
                {member?.paymentVerified
                  ? "Your payment has been verified by the group leader. Cart modifications are no longer allowed."
                  : "The group has been closed. No further modifications are allowed."}
              </p>
            </div>
          </div>
        </div>
      )}
      <Alert type="error" message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      {/* Add Item Form */}
      {!isLocked && (
        <Card title="Add Item">
          <form onSubmit={handleAdd}>
            <Input label="Product Name" name="productName" value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} placeholder="e.g. Maggi Noodles" required />
            <Input label="Product Link (optional)" name="productLink" value={form.productLink} onChange={(e) => setForm((f) => ({ ...f, productLink: e.target.value }))} placeholder="https://..." />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Quantity" name="quantity" type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="1" required />
              <Input label="Price (₹)" name="price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="14" required />
            </div>
            <Button type="submit" loading={addLoading} className="w-full">Add to Cart</Button>
          </form>
        </Card>
      )}

      {/* Cart Items */}
      <Card title={`Cart Items${member?.cartItems?.length ? ` (${member.cartItems.length})` : ""}`}>
        {!member || member.cartItems.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="No items in cart"
            description={isLocked ? "Your cart is locked." : "Add products to start building your order."}
          />
        ) : (
          <div className="space-y-3">
            {member.cartItems.map((item) => (
              <div key={item._id} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.itemTotal)}</p>
                </div>

                {editingItem === item._id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Qty" value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} className="w-16 border rounded px-2 py-1 text-sm" />
                    <input type="number" placeholder="Price" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} className="w-20 border rounded px-2 py-1 text-sm" />
                    <Button size="sm" onClick={() => handleEdit(item._id)}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
                  </div>
                ) : (
                  !isLocked && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => { setEditingItem(item._id); setEditForm({ quantity: String(item.quantity), price: String(item.price) }); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleRemove(item._id)}>Remove</Button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Total & Payment */}
      <Card>
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Cart Total</span>
          <span className="text-lg font-bold text-indigo-600">{formatCurrency(member?.totalAmount || 0)}</span>
        </div>
        {member && !member.paid && !isLocked && (
          <Button variant="secondary" className="w-full mt-4" onClick={() => {
            if (group?.leaderUpiId) {
              setShowPayModal(true);
            } else {
              handlePay();
            }
          }}>
            Mark as Paid
          </Button>
        )}
        {member && !member.paid && !isLocked && !group?.leaderUpiId && (
          <p className="text-xs text-amber-600 mt-2">⚠️ Leader has not configured payment details</p>
        )}
        {member?.paid && <Badge variant="success">Payment Marked</Badge>}
        {member?.paymentVerified && <Badge variant="info">Verified by Leader</Badge>}
      </Card>

      {/* Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Send Payment to Group Leader">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Transfer to</p>
          <p className="text-lg font-bold text-gray-900 mb-1">{group?.leaderName || group?.groupLeader?.split("@")[0]}</p>
          {group?.leaderUpiId ? (
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
              <p className="font-mono text-indigo-700 font-medium text-lg">{group.leaderUpiId}</p>
              <button
                onClick={() => navigator.clipboard.writeText(group.leaderUpiId)}
                className="mt-2 text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-200 transition"
              >
                📋 Copy UPI ID
              </button>
            </div>
          ) : (
            <p className="text-amber-600 text-sm mb-4">⚠️ Leader has not set UPI ID</p>
          )}
          <p className="text-sm text-gray-700 mb-1">Amount Due:</p>
          <p className="text-2xl font-bold text-indigo-600 mb-4">{formatCurrency(member?.totalAmount || 0)}</p>
          {group?.leaderUpiId && (
            <a
              href={`upi://pay?pa=${encodeURIComponent(group.leaderUpiId)}&pn=${encodeURIComponent(group.leaderName || "Leader")}&am=${member?.totalAmount || 0}&cu=INR`}
              className="inline-block mb-4 text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 transition"
            >
              📱 Pay via UPI App
            </a>
          )}
          <p className="text-xs text-gray-500 mb-4">Transfer the amount and then confirm below.</p>
          <Button className="w-full" onClick={() => { setShowPayModal(false); handlePay(); }}>
            I've Paid
          </Button>
        </div>
      </Modal>

      {/* AI Savings Banner */}
      {group && !isLocked && (
        <SavingsBanner group={group} summary={{ freeDeliveryAchieved: group.isClosed, remainingForFreeDelivery: Math.max(0, group.deliveryThreshold - (group.members?.reduce((s, m) => s + m.totalAmount, 0) || 0)) }} />
      )}

      {/* AI Suggestions */}
      {!isLocked && member?.cartItems?.length > 0 && (
        <SuggestionPanel
          cartItems={member.cartItems}
          onAddItem={(item) => handleAddAISuggestion(item)}
          disabled={isLocked}
        />
      )}

      {/* Threshold Recommendations */}
      {!isLocked && group && (
        <ThresholdSuggestions
          remaining={Math.max(0, group.deliveryThreshold - (group.members?.reduce((s, m) => s + m.totalAmount, 0) || 0))}
          cartItems={member?.cartItems || []}
          onAddItem={(item) => handleAddAISuggestion(item)}
          disabled={isLocked}
        />
      )}

      {/* Order Templates */}
      {!isLocked && (
        <OrderTemplates
          onApplyTemplate={handleApplyTemplate}
          disabled={isLocked}
        />
      )}
    </div>
  );
}
