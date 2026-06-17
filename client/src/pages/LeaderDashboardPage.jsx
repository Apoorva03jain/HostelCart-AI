import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { Card } from "../components/shared/Card";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Badge } from "../components/shared/Badge";
import { Alert } from "../components/shared/Alert";
import { Modal } from "../components/shared/Modal";
import { MetricCard } from "../components/shared/MetricCard";
import { ProgressBar } from "../components/shared/ProgressBar";
import { EmptyState } from "../components/shared/EmptyState";
import { ToastContainer } from "../components/shared/Toast";
import { CardSkeleton, TableSkeleton } from "../components/shared/Skeleton";
import { ShoppingInsights } from "../components/features/ai/ShoppingInsights";
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
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdData, setThresholdData] = useState(null);

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    on("member-joined", (data) => { addToast(`${data.name} joined the group!`, "info"); fetchData(); });
    on("payment-submitted", (data) => { addToast(`${data.email} submitted payment`, "info"); fetchData(); });
    on("payment-verified", (data) => { addToast(`Payment verified for ${data.email}`, "success"); fetchData(); });
    on("cart-item-added", () => fetchData());
    on("cart-item-updated", () => fetchData());
    on("cart-item-removed", () => fetchData());
    on("group-closed", () => { addToast("Group closed", "warning"); fetchData(); });
    on("threshold-reached", (data) => {
      setThresholdData(data);
      setShowThresholdModal(true);
    });
  }, [on, addToast]);

  const fetchData = async () => {
    try {
      const { data } = await api.get("/groups");
      const found = data.find((g) => g._id === id);
      if (import.meta.env.DEV && found) {
        console.log("📊 Leader Dashboard Data:", {
          members: found.members.map(m => ({ email: m.email, paid: m.paid, paymentVerified: m.paymentVerified }))
        });
      }
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
      const { data } = await api.post(`/groups/${id}/verify-payment`, { email: memberEmail });
      setSuccess(`Payment verified for ${memberEmail}`);
      fetchData();
      // Show threshold modal if reached
      if (data.thresholdReached) {
        setThresholdData({
          verifiedTotal: data.verifiedTotal,
          threshold: group?.deliveryThreshold,
          pendingCount: data.pendingCount,
        });
        setShowThresholdModal(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify payment");
    } finally {
      setActionLoading("");
    }
  };

  const handleLeaderSelfVerify = async () => {
    setError(""); setSuccess("");
    setActionLoading("self-verify");
    try {
      // Re-submit payment — this triggers the auto-verify logic on backend
      await api.post(`/groups/${id}/pay`, { email: user.email });
      setSuccess("Leader payment auto-verified");
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to self-verify");
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

  if (loading) return (
    <div className="space-y-6">
      <CardSkeleton />
      <TableSkeleton rows={4} />
    </div>
  );
  if (!group) return <Alert type="error" message="Group not found" />;

  const isLeader = group.groupLeader.toLowerCase() === user?.email?.toLowerCase();
  if (!isLeader) return <Alert type="error" message="Only the group leader can access this page." />;

  // Analytics
  const totalMembers = group.members.length;
  const paidMembers = group.members.filter((m) => m.paid).length;
  const verifiedMembers = group.members.filter((m) => m.paymentVerified).length;
  const pendingMembers = totalMembers - paidMembers;
  const groupTotal = group.members.reduce((s, m) => s + m.totalAmount, 0);
  const paymentPercent = totalMembers > 0 ? Math.round((verifiedMembers / totalMembers) * 100) : 0;

  // Sort: unpaid first, then paid-unverified, then verified
  const sortedMembers = [...group.members].sort((a, b) => {
    if (!a.paid && b.paid) return -1;
    if (a.paid && !b.paid) return 1;
    if (!a.paymentVerified && b.paymentVerified) return -1;
    if (a.paymentVerified && !b.paymentVerified) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leader Dashboard</h1>
          <p className="text-sm text-gray-500">{group.storeName} • {group.hostelName}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm">👑</span>
            <span className="text-sm font-medium text-indigo-700">{group.leaderName || user?.name}</span>
            <span className="text-xs text-gray-400">{group.groupLeader}</span>
          </div>
        </div>
        <Badge variant={group.isClosed ? "danger" : "success"}>
          {group.isClosed ? "Closed" : "Active"}
        </Badge>
      </div>

      <Alert type="error" message={error} onClose={() => setError("")} />
      <Alert type="success" message={success} onClose={() => setSuccess("")} />

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Total Members" value={totalMembers} icon="👥" color="indigo" />
        <MetricCard label="Paid" value={paidMembers} icon="💰" color="yellow" />
        <MetricCard label="Verified" value={verifiedMembers} icon="✅" color="green" />
        <MetricCard label="Pending" value={pendingMembers} icon="⏳" color="red" />
      </div>

      {/* Order Summary */}
      <Card title="Order Summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Group Total</p>
            <p className="text-xl font-bold text-indigo-600">{formatCurrency(groupTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Payment Progress</p>
            <p className="text-xl font-bold text-green-600">{paymentPercent}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Threshold</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(group.deliveryThreshold)}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={verifiedMembers} max={totalMembers} label="Verification Completion" />
        </div>
      </Card>

      {/* Payment Verification Table */}
      <Card title="Payment Verification">
        {totalMembers === 0 ? (
          <EmptyState icon="👤" title="No members yet" description="Members will appear here once they join." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Member</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member, idx) => (
                  <tr key={idx} className={`border-t ${!member.paid ? "bg-red-50/30" : member.paid && !member.paymentVerified ? "bg-yellow-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(member.totalAmount)}</td>
                    <td className="px-4 py-3">
                      {member.paymentVerified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : member.paid ? (
                        <Badge variant="warning">Awaiting Verification</Badge>
                      ) : (
                        <Badge variant="danger">Unpaid</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {member.paid && !member.paymentVerified && member.email.toLowerCase() !== user?.email?.toLowerCase() && (
                        <Button
                          size="sm"
                          onClick={() => handleVerifyPayment(member.email)}
                          loading={actionLoading === `verify-${member.email}`}
                        >
                          Verify
                        </Button>
                      )}
                      {member.paid && !member.paymentVerified && member.email.toLowerCase() === user?.email?.toLowerCase() && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleLeaderSelfVerify}
                          loading={actionLoading === "self-verify"}
                        >
                          Self-Verify
                        </Button>
                      )}
                      {member.paymentVerified && member.email.toLowerCase() === user?.email?.toLowerCase() && (
                        <span className="text-green-600 text-sm font-medium">✓ Auto-Verified (Leader)</span>
                      )}
                      {member.paymentVerified && member.email.toLowerCase() !== user?.email?.toLowerCase() && (
                        <span className="text-green-600 text-sm font-medium">✓ Done</span>
                      )}
                      {!member.paid && <span className="text-gray-400 text-xs">Waiting for payment</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Fee Editor */}
      <Card title="Fee Management">
        <form onSubmit={handleUpdateFees}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Delivery Fee (₹)" name="deliveryFee" type="number" value={fees.deliveryFee} onChange={(e) => setFees((f) => ({ ...f, deliveryFee: e.target.value }))} />
            <Input label="Handling Fee (₹)" name="handlingFee" type="number" value={fees.handlingFee} onChange={(e) => setFees((f) => ({ ...f, handlingFee: e.target.value }))} />
            <Input label="Platform Fee (₹)" name="platformFee" type="number" value={fees.platformFee} onChange={(e) => setFees((f) => ({ ...f, platformFee: e.target.value }))} />
          </div>
          <Button type="submit" className="mt-3" loading={actionLoading === "fees"} disabled={group.isClosed}>
            Update Fees
          </Button>
        </form>
      </Card>

      {/* Payment Details */}
      <Card title="💳 Payment Details">
        <div className="mb-3">
          <p className="text-sm text-gray-500">Current UPI ID:</p>
          <p className="font-mono text-indigo-700 font-medium">{group.leaderUpiId || "Not set"}</p>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const upiInput = e.target.upiId.value.trim();
          if (!upiInput || upiInput.length < 3) { setError("Valid UPI ID required"); return; }
          setActionLoading("upi");
          try {
            await api.put(`/groups/${id}/payment-details`, { leaderUpiId: upiInput });
            setSuccess("UPI ID updated");
            fetchData();
          } catch (err) {
            setError(err.response?.data?.message || "Failed to update UPI ID");
          } finally {
            setActionLoading("");
          }
        }}>
          <div className="flex gap-2">
            <input
              name="upiId"
              type="text"
              defaultValue={group.leaderUpiId || ""}
              placeholder="yourname@paytm"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Button type="submit" size="sm" loading={actionLoading === "upi"}>
              Update
            </Button>
          </div>
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
          <Button variant="secondary" onClick={handleViewShoppingList} disabled={!group.isClosed}>
            View Final Shopping List
          </Button>
        </div>
        {!group.isClosed && (
          <p className="text-xs text-gray-400 mt-2">Close the group to generate the final shopping list.</p>
        )}
      </Card>

      {/* AI Shopping Insights */}
      {group.members.length > 0 && (
        <ShoppingInsights group={group} />
      )}

      {/* Shopping List */}
      {shoppingList && (
        <Card title="Final Shopping List">
          <div className="flex gap-4 text-sm text-gray-500 mb-4">
            <span>{shoppingList.verifiedMembers} verified members</span>
            <span>•</span>
            <span>Total: {formatCurrency(shoppingList.groupTotal)}</span>
          </div>
          {shoppingList.shoppingList.length === 0 ? (
            <EmptyState icon="📋" title="No verified items" description="Verify member payments to populate the shopping list." />
          ) : (
            <div className="space-y-2">
              {shoppingList.shoppingList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3">
                  <span className="font-medium text-gray-900">{item.productName}</span>
                  <Badge variant="info">x{item.totalQuantity}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Threshold Achievement Modal */}
      <Modal isOpen={showThresholdModal} onClose={() => setShowThresholdModal(false)} title="🎉 Threshold Achieved">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Verified payments have reached the delivery threshold!
          </p>
          {thresholdData && (
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-sm">Verified Amount: <span className="font-bold text-green-700">{formatCurrency(thresholdData.verifiedTotal)}</span></p>
              <p className="text-sm">Threshold: <span className="font-bold">{formatCurrency(thresholdData.threshold || group?.deliveryThreshold)}</span></p>
              {thresholdData.pendingCount > 0 && (
                <p className="text-sm text-amber-600 mt-2">{thresholdData.pendingCount} member(s) still awaiting verification</p>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 mb-4">What would you like to do?</p>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" className="w-full" onClick={() => setShowThresholdModal(false)}>
              Verify More Payments
            </Button>
            <Button variant="danger" className="w-full" onClick={() => { setShowThresholdModal(false); handleCloseGroup(); }}>
              Close Group & Place Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
