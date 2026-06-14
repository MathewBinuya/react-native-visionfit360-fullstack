import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../lib/api";

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    api.get(`/users/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load user"));
  };

  useEffect(() => { load(); }, [id]);

  const toggleStatus = async () => {
    const newStatus = data.user.status === "inactive" ? "active" : "inactive";
    try {
      const res = await api.patch(`/users/${id}/status`, { status: newStatus });
      setData({ ...data, user: res.data });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <button className="btn-small" style={{ marginBottom: 16 }} onClick={() => navigate("/users")}>
          ← Back to Users
        </button>
        <h1 className="page-title">User Account</h1>
        {error && <div className="error">{error}</div>}

        {!data ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="card">
              <h2>Account Information</h2>
              <div className="info-row"><span>Name</span><span>{data.user.name || "—"}</span></div>
              <div className="info-row"><span>Username</span><span>{data.user.username}</span></div>
              <div className="info-row"><span>Email</span><span>{data.user.email}</span></div>
              <div className="info-row"><span>Gender</span><span>{data.user.gender || "—"}</span></div>
              <div className="info-row"><span>Height</span><span>{data.user.heightCm ? data.user.heightCm + " cm" : "—"}</span></div>
              <div className="info-row"><span>Weight</span><span>{data.user.weightKg ? data.user.weightKg + " kg" : "—"}</span></div>
              <div className="info-row"><span>Date Created</span><span>{new Date(data.user.createdAt).toLocaleString()}</span></div>
              <div className="info-row">
                <span>Current Status</span>
                <span className={data.user.status === "inactive" ? "badge-inactive" : "badge-active"}>
                  {data.user.status || "active"}
                </span>
              </div>
              <button className="btn-small" style={{ marginTop: 16 }} onClick={toggleStatus}>
                {data.user.status === "inactive" ? "Set Active" : "Set Inactive"}
              </button>
            </div>

            <div className="card">
              <h2>Workout History ({data.workouts.length})</h2>
              <table>
                <thead>
                  <tr><th>Title</th><th>Completed</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {data.workouts.map((w) => (
                    <tr key={w._id}>
                      <td>{w.title}</td>
                      <td>{w.completed ? "Yes" : "No"}</td>
                      <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {data.workouts.length === 0 && (
                    <tr><td colSpan="3" style={{ color: "var(--gray)" }}>No workouts.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}