import { createContext, useState, useEffect } from "react";
import { TOKEN_KEY } from "../utils/constants";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data } = await api.get("/profile");
      setState({
        user: data,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      connectSocket();
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post("/login", { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);

    const { data: user } = await api.get("/profile");
    setState({
      user,
      token: data.token,
      isAuthenticated: true,
      isLoading: false,
    });
    connectSocket();
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    disconnectSocket();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
