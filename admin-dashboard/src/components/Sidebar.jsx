import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("adminName") || "Admin";

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
      <NavLink to="/exercises" className={({ isActive }) => isActive ? "active" : ""}>Exercises</NavLink>
      <button className="logout" onClick={logout}>Log out ({adminName})</button>
    </div>
  );
}