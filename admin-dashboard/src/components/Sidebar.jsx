import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("adminName") || "Admin";
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e) => { if (e.key === "Escape") setConfirming(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <div className="brand">VisionFIT360</div>
      <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>Dashboard</NavLink>
      <NavLink to="/users" className={({ isActive }) => isActive ? "active" : ""}>Users</NavLink>
      <NavLink to="/users-per-exercise" className={({ isActive }) => isActive ? "active" : ""}>Users per Exercise</NavLink>
      <NavLink to="/security" className={({ isActive }) => isActive ? "active" : ""}>Security</NavLink>
      <button className="logout" onClick={() => setConfirming(true)}>Log out ({adminName})</button>

      {confirming && (
        <div className="dialog-backdrop" onClick={() => setConfirming(false)}>
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-title" className="dialog-title">Log out?</h2>
            <p className="dialog-text">You'll need your password and a verification code to sign back in.</p>
            <div className="dialog-actions">
              <button className="btn-ghost" onClick={() => setConfirming(false)} autoFocus>Cancel</button>
              <button className="btn-small" onClick={logout}>Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
