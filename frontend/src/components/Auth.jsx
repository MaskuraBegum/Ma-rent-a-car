import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
    // api.js sends this when the server says the login is no longer valid
    const expired = () => setAdmin(null);
    window.addEventListener("auth:expired", expired);
    return () => window.removeEventListener("auth:expired", expired);
  }, []);

  const login = useCallback(async (email, password) => setAdmin(await api.post("/auth/login", { email, password })), []);
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAdmin(null);
    }
  }, []);

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}

// Wraps every page that needs a signed-in admin
export function RequireAdmin({ children }) {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="p-6 text-sm text-slate-500">Loading...</p>;
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}