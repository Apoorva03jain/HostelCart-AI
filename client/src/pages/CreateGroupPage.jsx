import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Card } from "../components/shared/Card";
import { Alert } from "../components/shared/Alert";
import api from "../services/api";

export function CreateGroupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    storeName: "",
    hostelName: user?.hostelName || "",
    closingTime: "",
    deliveryThreshold: "199",
    deliveryFee: "40",
    handlingFee: "0",
    platformFee: "0",
    closeMode: "TIME",
    leaderUpiId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.leaderUpiId.trim() || form.leaderUpiId.trim().length < 3) {
      setError("Please enter a valid UPI ID (e.g. yourname@paytm)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        storeName: form.storeName,
        leaderName: user.name,
        hostelName: form.hostelName,
        closingTime: new Date(form.closingTime).toISOString(),
        deliveryThreshold: Number(form.deliveryThreshold),
        deliveryFee: Number(form.deliveryFee),
        handlingFee: Number(form.handlingFee),
        platformFee: Number(form.platformFee),
        closeMode: form.closeMode,
        leaderUpiId: form.leaderUpiId.trim(),
      };

      const { data } = await api.post("/groups", payload);
      navigate(`/groups/${data.group._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card title="Create New Group">
        <Alert type="error" message={error} onClose={() => setError("")} />
        <form onSubmit={handleSubmit}>
          <Input label="Store Name" name="storeName" value={form.storeName} onChange={handleChange} placeholder="e.g. Blinkit, Zepto" required />
          <Input label="Hostel Name" name="hostelName" value={form.hostelName} onChange={handleChange} placeholder="e.g. Brahmaputra" required />
          <Input label="Closing Time" name="closingTime" type="datetime-local" value={form.closingTime} onChange={handleChange} required />
          <Input label="Delivery Threshold (₹)" name="deliveryThreshold" type="number" value={form.deliveryThreshold} onChange={handleChange} placeholder="199" required />
          <Input label="Delivery Fee (₹)" name="deliveryFee" type="number" value={form.deliveryFee} onChange={handleChange} placeholder="40" />
          <Input label="Handling Fee (₹)" name="handlingFee" type="number" value={form.handlingFee} onChange={handleChange} placeholder="0" />
          <Input label="Platform Fee (₹)" name="platformFee" type="number" value={form.platformFee} onChange={handleChange} placeholder="0" />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Close Mode</label>
            <select
              name="closeMode"
              value={form.closeMode}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="TIME">Time-based</option>
              <option value="TARGET">Target-based (auto-close on threshold)</option>
            </select>
          </div>
          <Input
            label="Your UPI ID"
            name="leaderUpiId"
            value={form.leaderUpiId}
            onChange={handleChange}
            placeholder="e.g. yourname@paytm"
            required
          />
          <p className="text-xs text-gray-500 -mt-3 mb-4">Members will transfer payment to this UPI ID.</p>
          <Button type="submit" loading={loading} className="w-full">
            Create Group
          </Button>
        </form>
      </Card>
    </div>
  );
}
