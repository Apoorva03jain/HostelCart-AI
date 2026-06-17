import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Branding */}
          <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
            HostelCart
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 transition">
              Dashboard
            </Link>
            <Link to="/groups/create" className="text-gray-600 hover:text-indigo-600 transition">
              Create Group
            </Link>
            {user && (
              <span className="text-sm text-gray-500">
                {user.name} • {user.hostelName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 transition"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/dashboard" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
              Dashboard
            </Link>
            <Link to="/groups/create" className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
              Create Group
            </Link>
            {user && (
              <p className="px-3 py-2 text-sm text-gray-500">
                {user.name} • {user.hostelName}
              </p>
            )}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
