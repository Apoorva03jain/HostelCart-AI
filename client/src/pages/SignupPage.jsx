import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Card } from "../components/shared/Card";
import { Alert } from "../components/shared/Alert";
import api from "../services/api";

export function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    hostelName: "",
    roomNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/signup", form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">Create Account</h1>
        <Alert type="error" message={error} onClose={() => setError("")} />
        <form onSubmit={handleSubmit}>
          <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <Input label="Password" name="password" type="password" value={form.password} onChange={handleChange} required />
          <Input label="Hostel Name" name="hostelName" value={form.hostelName} onChange={handleChange} required />
          <Input label="Room Number" name="roomNumber" value={form.roomNumber} onChange={handleChange} />
          <Button type="submit" loading={loading} className="w-full">
            Sign Up
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
