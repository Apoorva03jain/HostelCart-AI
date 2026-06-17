import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { GroupProvider } from "./contexts/GroupContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateGroupPage } from "./pages/CreateGroupPage";
import { GroupDetailsPage } from "./pages/GroupDetailsPage";
import { CartPage } from "./pages/CartPage";
import { LeaderDashboardPage } from "./pages/LeaderDashboardPage";

function App() {
  return (
    <AuthProvider>
      <GroupProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
          } />
          <Route path="/groups/create" element={
            <ProtectedRoute><Layout><CreateGroupPage /></Layout></ProtectedRoute>
          } />
          <Route path="/groups/:id" element={
            <ProtectedRoute><Layout><GroupDetailsPage /></Layout></ProtectedRoute>
          } />
          <Route path="/groups/:id/cart" element={
            <ProtectedRoute><Layout><CartPage /></Layout></ProtectedRoute>
          } />
          <Route path="/groups/:id/leader" element={
            <ProtectedRoute><Layout><LeaderDashboardPage /></Layout></ProtectedRoute>
          } />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </GroupProvider>
    </AuthProvider>
  );
}

export default App;
