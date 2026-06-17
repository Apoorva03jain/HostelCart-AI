import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { Card } from "../components/shared/Card";
import { Button } from "../components/shared/Button";
import { Badge } from "../components/shared/Badge";
import { ProgressBar } from "../components/shared/ProgressBar";
import { Alert } from "../components/shared/Alert";
import { MetricCard } from "../components/shared/MetricCard";
import { EmptyState } from "../components/shared/EmptyState";
import { ToastContainer } from "../components/shared/Toast";
import { CardSkeleton } from "../components/shared/Skeleton";
import { SavingsBanner } from "../components/features/ai/SavingsBanner";
import { ShoppingInsights } from "../components/features/ai/ShoppingInsights";
import { formatCurrency } from "../utils/formatters";
import api from "../services/api";

export function GroupDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { on, toasts, addToast, removeToast } = useSocket(id);
  const [group, setGroup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchGroupData(); }, [id]);

  useEffect(() => {
    on("member-joined", (data) => { addToast(`${data.name} joined the group!`, "info"); fetchGroupData(); });
    on("cart-item-added", () => fetchGroupData());
    on("cart-item-updated", () => fetchGroupData());
    on("cart-item-removed", () => fetchGroupData());
    on("payment-submitted", (data) => { addToast(`${data.email} marked payment`, "info"); fetchGroupData(); });
    on("payment-verified", (data) => { addToast(`Payment verified for ${data.email}`, "success"); fetchGroupData(); });
    on("fees-updated", () => { addToast("Fees updated by leader", "info"); fetchGroupData(); });
    on("group-closed", () => { addToast("Group has been closed!", "warning"); fetchGroupData(); });
  }, [on, addToast]);

  const fetchGroupData = async () => {
    try {
      const [groupsRes, summaryRes] = await Promise.all([
        api.get("/groups"),
        api.get(`/groups/${id}/summary`),
      ]);
      const found = groupsRes.data.find((g) => g._id === id);
      setGroup(found || null);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <CardSkeleton />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
  if (!group) return <Alert type="error" message="Group not found" />;

  const isLeader = group.groupLeader.toLowerCase() === user?.email?.toLowerCase();
  const groupTotal = group.members.reduce((s, m) => s + m.totalAmount, 0);
  const totalProducts = group.members.reduce((s, m) => s + m.cartItems.length, 0);
  const totalQuantity = group.members.reduce((s, m) => s + m.cartItems.reduce((q, i) => q + i.quantity, 0), 0);
  const paidMembers = group.members.filter((m) => m.paid).length;
  const verifiedMembers = group.members.filter((m) => m.paymentVerified).length;
  const totalFees = (summary?.freeDeliveryAchieved ? 0 : group.deliveryFee) + group.handlingFee + group.platformFee;
  const feePerMember = group.members.length > 0 ? totalFees / group.members.length : 0;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Group Header */}
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.storeName}</h1>
            <p className="text-sm text-gray-500 mt-1">{group.hostelName}</p>
          </div>
          <Badge variant={group.isClosed ? "danger" : "success"}>
            {group.isClosed ? "Closed" : "Active"}
          </Badge>
        </div>

        {/* Leader Profile */}
        <div className="mt-4 flex items-center gap-3 bg-indigo-50 rounded-lg px-4 py-3">
          <span className="text-xl">👑</span>
          <div>
            <p className="text-sm font-semibold text-indigo-900">{group.leaderName || group.groupLeader.split("@")[0]}</p>
            <p className="text-xs text-indigo-600">{group.groupLeader}</p>
          </div>
          {isLeader && <Badge variant="info">You</Badge>}
        </div>
      </Card>

      {/* Delivery Threshold Analytics */}
      <Card title="Delivery Threshold Progress">
        {summary && (
          <>
            <ProgressBar
              value={summary.groupTotal}
              max={summary.deliveryThreshold}
              label={`${formatCurrency(summary.groupTotal)} / ${formatCurrency(summary.deliveryThreshold)}`}
              showMilestones
            />
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {summary.freeDeliveryAchieved ? (
                <p className="text-green-600 font-medium">
                  🎉 Free delivery achieved!
                  {group.closeMode === "TIME" && !group.isClosed && " Group remains open until closing time."}
                </p>
              ) : (
                <p className="text-indigo-600 font-medium">
                  {formatCurrency(summary.remainingForFreeDelivery)} more for free delivery
                </p>
              )}
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">Mode: {group.closeMode}</span>
            </div>
          </>
        )}
      </Card>

      <Alert type="error" message={error} onClose={() => setError("")} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Members" value={group.members.length} icon="👥" color="indigo" />
        <MetricCard label="Products" value={totalProducts} icon="🛒" color="blue" />
        <MetricCard label="Total Qty" value={totalQuantity} icon="📦" color="green" />
        <MetricCard label="Paid" value={`${paidMembers}/${group.members.length}`} icon="💰" color="yellow" />
      </div>

      {/* Payment Analytics */}
      <Card title="Payment Status">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
          <div><p className="text-gray-500">Total</p><p className="text-xl font-bold text-gray-900">{group.members.length}</p></div>
          <div><p className="text-gray-500">Paid</p><p className="text-xl font-bold text-yellow-600">{paidMembers}</p></div>
          <div><p className="text-gray-500">Verified</p><p className="text-xl font-bold text-green-600">{verifiedMembers}</p></div>
          <div><p className="text-gray-500">Pending</p><p className="text-xl font-bold text-red-600">{group.members.length - paidMembers}</p></div>
        </div>
        <div className="mt-3">
          <ProgressBar value={verifiedMembers} max={group.members.length} label="Verification Progress" />
        </div>
      </Card>

      {/* Fee Breakdown & Estimates */}
      <Card title="Fee Breakdown & Estimates">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-center">
          <div>
            <p className="text-gray-500">Delivery</p>
            <p className="font-semibold">{summary?.freeDeliveryAchieved ? <span className="text-green-600">FREE</span> : formatCurrency(group.deliveryFee)}</p>
          </div>
          <div><p className="text-gray-500">Handling</p><p className="font-semibold">{formatCurrency(group.handlingFee)}</p></div>
          <div><p className="text-gray-500">Platform</p><p className="font-semibold">{formatCurrency(group.platformFee)}</p></div>
          <div>
            <p className="text-gray-500">Est. per person</p>
            <p className="font-semibold text-indigo-600">{formatCurrency(feePerMember)}</p>
          </div>
        </div>
      </Card>

      {/* Payment Information */}
      {group.leaderUpiId ? (
        <Card title="💳 Payment Information">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Pay to group leader</p>
            <p className="text-lg font-bold text-gray-900 mb-1">{group.leaderName || group.groupLeader.split("@")[0]}</p>
            <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg px-4 py-3 mb-3">
              <span className="font-mono text-indigo-700 font-medium">{group.leaderUpiId}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(group.leaderUpiId); }}
                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition"
              >
                Copy
              </button>
            </div>
            {/* Quick payment action for current user */}
            {(() => {
              const me = group.members.find(m => m.email.toLowerCase() === user?.email?.toLowerCase());
              if (!me) return null;
              if (me.paymentVerified) return <p className="text-sm text-green-600 font-medium mt-3">✓ Your payment is verified</p>;
              if (me.paid) return <p className="text-sm text-yellow-600 mt-3">⏳ Payment submitted — awaiting leader verification</p>;
              return (
                <Button
                  variant="secondary"
                  className="w-full mt-3"
                  onClick={async () => {
                    try {
                      await api.post(`/groups/${id}/pay`, { email: user.email });
                      fetchGroupData();
                    } catch {}
                  }}
                >
                  I've Paid
                </Button>
              );
            })()}
          </div>
        </Card>
      ) : (
        <Card title="💳 Payment Information">
          <p className="text-sm text-amber-600 text-center">⚠️ Leader has not configured payment details yet</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link to={`/groups/${id}/cart`}><Button>Go to Cart</Button></Link>
        {isLeader && <Link to={`/groups/${id}/leader`}><Button variant="secondary">Leader Dashboard</Button></Link>}
      </div>

      {/* AI Savings Banner */}
      {summary && !group.isClosed && (
        <SavingsBanner group={group} summary={summary} />
      )}

      {/* AI Shopping Insights */}
      {group.members.length > 0 && (
        <ShoppingInsights group={group} />
      )}

      {/* Members */}
      <Card title={`Members (${group.members.length})`}>
        {group.members.length === 0 ? (
          <EmptyState icon="👤" title="No members yet" description="Share the group link with your hostel mates." />
        ) : (
          <div className="space-y-3">
            {group.members.map((member, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email} • {member.cartItems.length} items</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(member.totalAmount)}</span>
                  {member.paymentVerified && <Badge variant="success">Verified</Badge>}
                  {!member.paymentVerified && member.paid && <Badge variant="warning">Paid</Badge>}
                  {!member.paid && <Badge variant="danger">Unpaid</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
