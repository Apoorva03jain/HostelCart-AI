import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { Card } from "../components/shared/Card";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Badge } from "../components/shared/Badge";
import { Alert } from "../components/shared/Alert";
import { Spinner } from "../components/shared/Spinner";
import { ToastContainer } from "../components/shared/Toast";
import { formatCurrency } from "../utils/formatters";
import api from "../services/api";

export function LeaderDashboardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { on, toasts, addToast, removeToast } = useSocket(id);
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fees, setFees] = useState({ deliveryFee: "", handlingFee: "", platformFee: "" });
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => { fetchData(); }, [id]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    on("member-joined", (data) => {
      addToast(`${data.name} joined the group!`, "info");
      fetchData();
    });
    on("payment-submitted", (data) => {
      addToast(`${data.email} submitted payment`, "info");
      fetchData();
    });
    on("cart-item-added", () => fetchData());
    on("cart-item-updated", () => fetchData());
    on("cart-item-removed", () => fetchData());
    on("group-closed", () => {
      addToast("Group auto-closed (threshold reached)", "warning");
      fetchData();
    });
  }, [on, addToast]);

  const fetchData = async () => {
    try {
      const { data } = await api.get("/groups");
      const found = data.find((g) => g._id === id);
      setGroup(found);
      if (found) {
        setFees({
          deliveryFee: String(found.deliveryFee),
          handlingFee: String(found.handlingFee),
          platformFee: String(found.platformFee),
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (memberEmail) => {
    setError(""); setSuccess("");
    setActionLoading(`verify-${memberEmail}`);
    try {
      await api.post(`/groups/${id}/verify-payment`, { email: memberEmail });
      setSuccess(`Payment verified for ${memberEmail}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify payment");
    } finally {
      setActionLoading("");
    }
  };

  const handleUpdateFees = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setActionLoading("fees");
    try {
      const payload = {};
      if (fees.deliveryFee !== "") payload.deliveryFee = Number(fees.deliveryFee);
      if (fees.handlingFee !== "") payload.handlingFee = Number(fees.handlingFee);
      if (fees.platformFee !== "") payload.platformFee = Number(fees.platformFee);
      await api.put(`/groups/${id}/fees`, payload);
      setSuccess("Fees updated successfully");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update fees");
    } finally {
      setActionLoading("");
    }
  };

  const handleCloseGroup = async () => {
    setError(""); setSuccess("");
    setActionLoading("close");
    try {
      await api.post(`/groups/${id}/close`);
      setSuccess("Group closed successfully");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to close group");
    } finally {
      setActionLoading("");
    }
  };

  const handleViewShoppingList = async () => {
    setError("");
    try {
      const { data } = await api.get(`/groups/${id}/final-shopping-list`);
      setShoppingList(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load shopping list");
    }
  };

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;
  if (!group) return <Alert type="error" message="Group not found" />;

  const isLeader = group.groupLeader.toLowerCase() === user?.email?.toLowerCase();
  if (!isLeader) {
    return <Alert type="error" message="Only the group leader can access this page." />;
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h1 className="text-2xl font-bold text-gray-900">Leader Dashboard</h1>
      <p className="text-sm text-gray-500">{group.storeName} • {group.hostelName}</p>

      <Alert type="error" message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      {/* Payment Verification */}
      <Card title="Payment Verification">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Member</th>
                <th className="text-left px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {group.members.map((member, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(member.totalAmount)}</td>
                  <td className="px-4 py-3">
                    {member.paymentVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : member.paid ? (
                      <Badge variant="warning">Paid</Badge>
                    ) : (
                      <Badge variant="danger">Unpaid</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {member.paid && !member.paymentVerified && (
                      <Button
                        size="sm"
                        onClick={() => handleVerifyPayment(member.email)}
                        loading={actionLoading === `verify-${member.email}`}
                      >
                        Verify
                      </Button>
                    )}
                    {member.paymentVerified && <span className="text-green-600 text-xs">✓ Done</span>}
                  </td>
                </tr>
              ))}
              {group.members.length === 0 && (
                <tr><td className="px-4 py-3 text-gray-500" colSpan={4}>No members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fee Editor */}
      <Card title="Update Fees">
        <form onSubmit={handleUpdateFees}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Delivery Fee (₹)" name="deliveryFee" type="number" value={fees.deliveryFee} onChange={(e) => setFees((f) => ({ ...f, deliveryFee: e.target.value }))} />
            <Input label="Handling Fee (₹)" name="handlingFee" type="number" value={fees.handlingFee} onChange={(e) => setFees((f) => ({ ...f, handlingFee: e.target.value }))} />
            <Input label="Platform Fee (₹)" name="platformFee" type="number" value={fees.platformFee} onChange={(e) => setFees((f) => ({ ...f, platformFee: e.target.value }))} />
          </div>
          <Button type="submit" className="mt-2" loading={actionLoading === "fees"}>Update Fees</Button>
        </form>
      </Card>

      {/* Group Actions */}
      <Card title="Group Actions">
        <div className="flex gap-3 flex-wrap">
          {!group.isClosed ? (
            <Button variant="danger" onClick={handleCloseGroup} loading={actionLoading === "close"}>
              Close Group
            </Button>
          ) : (
            <Badge variant="danger">Group is Closed</Badge>
          )}
          <Button variant="secondary" onClick={handleViewShoppingList}>
            View Final Shopping List
          </Button>
        </div>
      </Card>

      {/* Shopping List */}
      {shoppingList && (
        <Card title="Final Shopping List">
          <p className="text-sm text-gray-500 mb-3">
            {shoppingList.verifiedMembers} verified members • Total: {formatCurrency(shoppingList.groupTotal)}
          </p>
          {shoppingList.shoppingList.length === 0 ? (
            <p className="text-gray-500 text-sm">No verified items yet.</p>
          ) : (
            <div className="space-y-2">
              {shoppingList.shoppingList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                  <span className="font-medium text-gray-900">{item.productName}</span>
                  <Badge variant="info">x{item.totalQuantity}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
