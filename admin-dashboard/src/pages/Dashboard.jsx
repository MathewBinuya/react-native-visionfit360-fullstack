import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load stats"));
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Dashboard</h1>

        {error && <div className="error">{error}</div>}

        {!stats ? (
          <p>Loading stats...</p>
        ) : (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Total Users</div>
              <div className="value">{stats.totalUsers}</div>
            </div>
            <div className="stat-card">
              <div className="label">Active Users (7d)</div>
              <div className="value">{stats.activeUsers}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total Workouts</div>
              <div className="value">{stats.totalWorkouts}</div>
            </div>
            <div className="stat-card">
              <div className="label">Completed Workouts</div>
              <div className="value">{stats.completedWorkouts}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}