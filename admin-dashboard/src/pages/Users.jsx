import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../lib/api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUsers = () => {
    api.get("/users")
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Users</h1>
        {error && <div className="error">{error}</div>}

        <div className="card">
          <h2>All Users ({users.length})</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name || "—"}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={u.status === "inactive" ? "badge-inactive" : "badge-active"}>
                        {u.status || "active"}
                      </span>
                    </td>
                    <td>
                      <button className="btn-small" onClick={() => navigate(`/users/${u._id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="6" style={{ color: "var(--gray)" }}>No users yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}