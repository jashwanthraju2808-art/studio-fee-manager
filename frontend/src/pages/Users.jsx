import { useEffect, useState } from "react";
import {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
} from "../api/usersApi";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load users"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    try {
      await createUser({
        username,
        password,
        role,
      });

      setUsername("");
      setPassword("");
      setRole("staff");
      setShowCreate(false);

      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to create user"
      );
    }
  }

  async function toggleActive(user) {
    try {
      await updateUser(user.id, {
        is_active: !user.is_active,
      });

      await loadUsers();
    } catch (err) {
      alert(
        err.response?.data?.detail ||
        "Unable to update user"
      );
    }
  }

  async function changeRole(user) {
    const newRole =
      user.role === "admin" ? "staff" : "admin";

    const confirmed = window.confirm(
      `Change ${user.username} role to ${newRole}?`
    );

    if (!confirmed) return;

    try {
      await updateUser(user.id, {
        role: newRole,
      });

      await loadUsers();
    } catch (err) {
      alert(
        err.response?.data?.detail ||
        "Unable to change role"
      );
    }
  }

  async function handleResetPassword(user) {
    const newPassword = window.prompt(
      `Enter new password for ${user.username}:`
    );

    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      await resetUserPassword(user.id, newPassword);
      alert(`Password reset successfully for ${user.username}`);
    } catch (err) {
      alert(
        err.response?.data?.detail ||
        "Unable to reset password"
      );
    }
  }

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1>Users</h1>
          <p style={{ color: "#777" }}>
            Manage Antar Yoga staff and administrator accounts.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setShowCreate(!showCreate);
            setError("");
          }}
        >
          + Create User
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          style={{
            padding: 20,
            marginBottom: 24,
            borderRadius: 12,
            background: "#fff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Create User</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label>Username</label>
              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                minLength={3}
                maxLength={50}
                required
                placeholder="Enter username"
              />
            </div>

            <div>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                minLength={6}
                maxLength={100}
                required
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label>Role</label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value)
                }
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Create User
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{ marginLeft: 10 }}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 30 }}>
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 30 }}>
            No users found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={tdStyle}>{user.id}</td>

                    <td style={tdStyle}>
                      <strong>{user.username}</strong>
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "4px 9px",
                          borderRadius: 20,
                          background:
                            user.role === "admin"
                              ? "#ede9fe"
                              : "#e0f2fe",
                          color:
                            user.role === "admin"
                              ? "#6d28d9"
                              : "#0369a1",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      {user.is_active ? (
                        <span style={{ color: "#15803d" }}>
                          ● Active
                        </span>
                      ) : (
                        <span style={{ color: "#dc2626" }}>
                          ● Inactive
                        </span>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          toggleActive(user)
                        }
                        style={{ marginRight: 6 }}
                      >
                        {user.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          changeRole(user)
                        }
                        style={{ marginRight: 6 }}
                      >
                        Make{" "}
                        {user.role === "admin"
                          ? "Staff"
                          : "Admin"}
                      </button>

                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          handleResetPassword(user)
                        }
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 13,
};

const tdStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #f1f5f9",
};