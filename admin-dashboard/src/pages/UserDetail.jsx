import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { PresenceBadge, RatingStars, Avatar, StateBlock } from "../components/ui";
import api from "../lib/api";
import {
  relativeTime, dateTime, shortDate, ageFromDob, bmiInfo, exerciseLabel, displayName,
} from "../lib/format";

// mirror the backend presence windows so the badge matches the dashboard
const ACTIVE_MS = 2 * 60 * 1000;
const RECENT_MS = 15 * 60 * 1000;
const GOAL_LABELS = {
  get_fit: "Get fit",
  maintain_weight: "Maintain weight",
  get_lean: "Get lean",
};

const presenceOf = (lastActiveAt) => {
  if (!lastActiveAt) return "inactive";
  const age = Date.now() - new Date(lastActiveAt).getTime();
  if (age <= ACTIVE_MS) return "active";
  if (age <= RECENT_MS) return "recently_active";
  return "inactive";
};

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get(`/users/${id}`)
      .then((res) => { setData(res.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load user"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async () => {
    const newStatus = data.user.status === "inactive" ? "active" : "inactive";
    try {
      const res = await api.patch(`/users/${id}/status`, { status: newStatus });
      setData({ ...data, user: res.data });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const u = data?.user;
  const age = u ? ageFromDob(u.dateOfBirth) : null;
  const bmi = u ? bmiInfo(u.heightCm, u.weightKg) : null;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <button className="btn-small" style={{ marginBottom: 16 }} onClick={() => navigate("/users")}>
          ← Back to Users
        </button>
        <h1 className="page-title">User Account</h1>

        <StateBlock loading={loading && !data} error={error}>
          {u && (
            <>
              <div className="card">
                <div className="user-cell" style={{ marginBottom: 16 }}>
                  <Avatar user={u} size={48} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{displayName(u)}</div>
                    <div className="muted" style={{ fontSize: 13 }}>@{u.username}</div>
                  </div>
                  <span style={{ marginLeft: "auto" }}>
                    <PresenceBadge status={presenceOf(u.lastActiveAt)} />
                  </span>
                </div>

                <div className="info-row"><span>Email</span><span>{u.email}</span></div>
                <div className="info-row"><span>Gender</span><span>{u.gender || "Not specified"}</span></div>
                <div className="info-row"><span>Goal</span><span>{GOAL_LABELS[u.goal] || "Not specified"}</span></div>
                <div className="info-row"><span>Age</span><span>{age != null ? `${age} yrs` : "Not specified"}</span></div>
                <div className="info-row"><span>Height</span><span>{u.heightCm ? `${u.heightCm} cm` : "Not specified"}</span></div>
                <div className="info-row"><span>Weight</span><span>{u.weightKg ? `${u.weightKg} kg` : "Not specified"}</span></div>
                <div className="info-row">
                  <span>BMI</span>
                  <span>{bmi ? `${bmi.bmi} (${bmi.category})` : "Not specified"}</span>
                </div>
                <div className="info-row"><span>Joined</span><span>{dateTime(u.createdAt)}</span></div>
                <div className="info-row"><span>Last login</span><span>{u.lastLoginAt ? relativeTime(u.lastLoginAt) : "Never"}</span></div>
                <div className="info-row"><span>Last active</span><span>{u.lastActiveAt ? relativeTime(u.lastActiveAt) : "Never"}</span></div>
                <div className="info-row">
                  <span>Account status</span>
                  <span className={u.status === "inactive" ? "badge-inactive" : "badge-active"}>
                    {u.status || "active"}
                  </span>
                </div>
                <button className="btn-small" style={{ marginTop: 16 }} onClick={toggleStatus}>
                  {u.status === "inactive" ? "Set Active" : "Set Inactive"}
                </button>
              </div>

              <div className="card">
                <h2>Workout History ({data.workouts.length})</h2>
                <StateBlock empty={data.workouts.length === 0} emptyText="No workouts.">
                  <table className="rows">
                    <thead>
                      <tr><th>Title</th><th>Exercises</th><th>Completed</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {data.workouts.map((w) => (
                        <tr key={w._id}>
                          <td>{w.title || "—"}</td>
                          <td className="muted">
                            {(w.exercises || []).map((e) => exerciseLabel(e.name)).join(", ") || "—"}
                          </td>
                          <td>{w.completed ? "Yes" : "No"}</td>
                          <td className="muted">{shortDate(w.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StateBlock>
              </div>

              <div className="card">
                <h2>Feedback ({data.feedback?.length || 0})</h2>
                <StateBlock empty={!data.feedback?.length} emptyText="No feedback from this user.">
                  <ul className="feedback-list">
                    {data.feedback?.map((f) => (
                      <li key={f._id} className="feedback-item">
                        <div className="feedback-item-head">
                          <RatingStars value={f.rating} />
                          <span className="person-time">{relativeTime(f.createdAt)}</span>
                        </div>
                        {f.comment ? <p className="feedback-comment">{f.comment}</p> : null}
                      </li>
                    ))}
                  </ul>
                </StateBlock>
              </div>
            </>
          )}
        </StateBlock>
      </div>
    </div>
  );
}
