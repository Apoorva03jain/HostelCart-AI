import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Badge } from "../components/shared/Badge";
import { ProgressBar } from "../components/shared/ProgressBar";
import { Spinner } from "../components/shared/Spinner";
import { Alert } from "../components/shared/Alert";
import api from "../services/api";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinLoading, setJoinLoading] = useState(null);

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

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Available Groups</h1>
        <Link to="/groups/create">
          <Button>+ Create Group</Button>
        </Link>
      </div>

      <Alert type="error" message={error} onClose={() => setError("")} />

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No groups yet. Be the first to create one!</p>
          <Link to="/groups/create">
            <Button>Create a Group</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const memberInGroup = isMember(group);
            const groupTotal = group.members.reduce((sum, m) => sum + m.totalAmount, 0);

            return (
              <Card key={group._id} className="hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{group.storeName}</h3>
                  <Badge variant={group.isClosed ? "danger" : "success"}>
                    {group.isClosed ? "Closed" : "Active"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{group.hostelName}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {group.members.length} member{group.members.length !== 1 ? "s" : ""} • {group.closeMode}
                </p>

                <div className="mt-3">
                  <ProgressBar
                    value={groupTotal}
                    max={group.deliveryThreshold}
                    label={`₹${groupTotal} / ₹${group.deliveryThreshold}`}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  {memberInGroup ? (
                    <Link to={`/groups/${group._id}`} className="flex-1">
                      <Button variant="secondary" className="w-full">View Group</Button>
                    </Link>
                  ) : (
                    <Button
                      className="flex-1"
                      onClick={() => handleJoin(group._id)}
                      disabled={group.isClosed}
                      loading={joinLoading === group._id}
                    >
                      {group.isClosed ? "Closed" : "Join Group"}
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
