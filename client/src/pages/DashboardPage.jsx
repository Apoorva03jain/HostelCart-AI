import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Badge } from "../components/shared/Badge";
import { ProgressBar } from "../components/shared/ProgressBar";
import { Alert } from "../components/shared/Alert";
import { MetricCard } from "../components/shared/MetricCard";
import { EmptyState } from "../components/shared/EmptyState";
import { CardSkeleton } from "../components/shared/Skeleton";
import { GroupRecommendations } from "../components/features/ai/GroupRecommendations";
import { formatCurrency } from "../utils/formatters";
import api from "../services/api";

const TABS = [
  { id: "active", label: "Active Groups" },
  { id: "my", label: "My Groups" },
  { id: "closed", label: "Closed" },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinLoading, setJoinLoading] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (groupId) => {
    setJoinLoading(groupId);
    try {
      await api.post(`/groups/${groupId}/join`, {
        name: user.name,
        email: user.email,
      });
      await fetchGroups();
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join group");
    } finally {
      setJoinLoading(null);
    }
  };

  const isMember = (group) => {
    return group.members.some(
      (m) => m.email.toLowerCase() === user?.email?.toLowerCase()
    );
  };

  // Derived lists
  const activeGroups = groups.filter((g) => !g.isClosed);
  const closedGroups = groups.filter((g) => g.isClosed);
  const myGroups = groups.filter((g) => isMember(g));

  // Current tab filter
  const displayedGroups =
    activeTab === "active" ? activeGroups :
    activeTab === "my" ? myGroups :
    closedGroups;

  // Empty state per tab
  const emptyMessages = {
    active: { icon: "🟢", title: "No active groups", desc: "Create a group to start saving on delivery." },
    my: { icon: "👤", title: "You haven't joined any groups", desc: "Join an active group from the list above." },
    closed: { icon: "🔒", title: "No closed groups", desc: "Closed groups will appear here after completion." },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <Link to="/groups/create">
          <Button>+ Create Group</Button>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Total Groups" value={groups.length} icon="📦" color="indigo" />
        <MetricCard label="Active" value={activeGroups.length} icon="🟢" color="green" />
        <MetricCard label="My Groups" value={myGroups.length} icon="👤" color="blue" />
        <MetricCard label="Closed" value={closedGroups.length} icon="🔒" color="red" />
      </div>

      <Alert type="error" message={error} onClose={() => setError("")} />

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* AI Group Recommendations (only shows active, non-joined groups) */}
      {!loading && activeGroups.length > 0 && (
        <GroupRecommendations
          groups={activeGroups}
          userEmail={user?.email || ""}
          userHostel={user?.hostelName || ""}
          onJoin={handleJoin}
          joinLoading={joinLoading}
        />
      )}

      {/* Tabs */}
      {!loading && groups.length > 0 && (
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs bg-gray-100 rounded-full px-1.5 py-0.5">
                  {tab.id === "active" ? activeGroups.length : tab.id === "my" ? myGroups.length : closedGroups.length}
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Empty State (overall) */}
      {!loading && groups.length === 0 && (
        <Card>
          <EmptyState
            icon="🛒"
            title="No groups available"
            description="Create a group to start saving on delivery charges with your hostel mates."
            action={
              <Link to="/groups/create">
                <Button>Create First Group</Button>
              </Link>
            }
          />
        </Card>
      )}

      {/* Tab Empty State */}
      {!loading && groups.length > 0 && displayedGroups.length === 0 && (
        <Card>
          <EmptyState
            icon={emptyMessages[activeTab].icon}
            title={emptyMessages[activeTab].title}
            description={emptyMessages[activeTab].desc}
          />
        </Card>
      )}

      {/* Group Cards */}
      {!loading && displayedGroups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedGroups.map((group) => {
            const memberInGroup = isMember(group);
            const groupTotal = group.members.reduce((sum, m) => sum + m.totalAmount, 0);
            const remaining = Math.max(0, group.deliveryThreshold - groupTotal);

            return (
              <Card key={group._id} className="hover:shadow-md transition flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{group.storeName}</h3>
                  <Badge variant={group.isClosed ? "danger" : "success"}>
                    {group.isClosed ? "Closed" : "Active"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{group.hostelName}</p>
                <p className="text-xs text-indigo-600 mt-0.5">👑 {group.leaderName || group.groupLeader.split("@")[0]}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {group.members.length} member{group.members.length !== 1 ? "s" : ""} • {group.closeMode}
                </p>

                <div className="mt-3">
                  <ProgressBar
                    value={groupTotal}
                    max={group.deliveryThreshold}
                    label={`${formatCurrency(groupTotal)} / ${formatCurrency(group.deliveryThreshold)}`}
                  />
                </div>

                {!group.isClosed && remaining > 0 && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    {formatCurrency(remaining)} more for free delivery
                  </p>
                )}

                <div className="mt-auto pt-4 flex gap-2">
                  {memberInGroup ? (
                    <Link to={`/groups/${group._id}`} className="flex-1">
                      <Button variant="secondary" className="w-full">View Group</Button>
                    </Link>
                  ) : !group.isClosed ? (
                    <Button
                      className="flex-1"
                      onClick={() => handleJoin(group._id)}
                      loading={joinLoading === group._id}
                    >
                      Join Group
                    </Button>
                  ) : (
                    <Button variant="secondary" className="flex-1" disabled>
                      Closed
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
