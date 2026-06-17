import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { Card } from "../components/shared/Card";
import { Button } from "../components/shared/Button";
import { Badge } from "../components/shared/Badge";
import { ProgressBar } from "../components/shared/ProgressBar";
import { Spinner } from "../components/shared/Spinner";
import { Alert } from "../components/shared/Alert";
import { ToastContainer } from "../components/shared/Toast";
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

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  // Socket event listeners
  useEffect(() => {
    on("member-joined", (data) => {
      addToast(`${data.name} joined the group!`, "info");
      fetchGroupData();
    });
    on("cart-item-added", () => fetchGroupData());
    on("cart-item-updated", () => fetchGroupData());
    on("cart-item-removed", () => fetchGroupData());
    on("payment-submitted", (data) => {
      addToast(`${data.email} marked payment`, "info");
      fetchGroupData();
    });
    on("payment-verified", (data) => {
      addToast(`Payment verified for ${data.email}`, "success");
      fetchGroupData();
    });
    on("fees-updated", () => {
      addToast("Fees updated by leader", "info");
      fetchGroupData();
    });
    on("group-closed", () => {
      addToast("Group has been closed!", "warning");
      fetchGroupData();
    });
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

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;
  if (!group) return <Alert type="error" message="Group not found" />;

  const isLeader = group.groupLeader.toLowerCase() === user?.email?.toLowerCase();

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Group Header */}
      <Card>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.storeName}</h1>
            <p className="text-sm text-gray-500 mt-1">{group.hostelName}</p>
          </div>
          <Badge variant={group.isClosed ? "danger" : "success"}>
            {group.isClosed ? "Closed" : "Active"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Leader:</span> <span className="ml-1 font-medium">{group.groupLeader}</span></div>
          <div><span className="text-gray-500">Mode:</span> <span className="ml-1 font-medium">{group.closeMode}</span></div>
          <div><span className="text-gray-500">Members:</span> <span className="ml-1 font-medium">{group.members.length}</span></div>
          <div><span className="text-gray-500">Threshold:</span> <span className="ml-1 font-medium">{formatCurrency(group.deliveryThreshold)}</span></div>
        </div>

        {summary && (
          <div className="mt-4">
            <ProgressBar
              value={summary.groupTotal}
              max={summary.deliveryThreshold}
              label={`${formatCurrency(summary.groupTotal)} / ${formatCurrency(summary.deliveryThreshold)}`}
            />
            {summary.freeDeliveryAchieved ? (
              <p className="text-sm text-green-600 mt-2 font-medium">🎉 Free delivery achieved!</p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">{formatCurrency(summary.remainingForFreeDelivery)} more for free delivery</p>
            )}
          </div>
        )}
      </Card>

      <Alert type="error" message={error} onClose={() => setError("")} />

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link to={`/groups/${id}/cart`}>
          <Button>Go to Cart</Button>
        </Link>
        {isLeader && (
          <Link to={`/groups/${id}/leader`}>
            <Button variant="secondary">Leader Dashboard</Button>
          </Link>
        )}
      </div>

      {/* Fee Breakdown */}
      <Card title="Fee Breakdown">
        <div className="grid grid-cols-3 gap-4 text-sm text-center">
          <div>
            <p className="text-gray-500">Delivery</p>
            <p className="font-semibold">{formatCurrency(group.deliveryFee)}</p>
          </div>
          <div>
            <p className="text-gray-500">Handling</p>
            <p className="font-semibold">{formatCurrency(group.handlingFee)}</p>
          </div>
          <div>
            <p className="text-gray-500">Platform</p>
            <p className="font-semibold">{formatCurrency(group.platformFee)}</p>
          </div>
        </div>
      </Card>

      {/* Members */}
      <Card title="Members">
        {group.members.length === 0 ? (
          <p className="text-gray-500 text-sm">No members yet.</p>
        ) : (
          <div className="space-y-3">
            {group.members.map((member, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(member.totalAmount)}</span>
                  {member.paymentVerified && <Badge variant="success">Verified</Badge>}
                  {!member.paymentVerified && member.paid && <Badge variant="warning">Paid</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
