import { createContext, useContext, useEffect, useState } from "react";
import API from "../api/axios";

const AuthContext = createContext({
  user: null,
  setUser: () => {},
  isAdmin: false,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    API.get("/auth/me")
      .then((res) => {
        setUser({
          id:       res.data.id,
          username: res.data.username,
          role:     res.data.role,
        });
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin: user?.role === "admin", loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
