import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Avatar, StateBlock } from "../components/ui";
import api from "../lib/api";
import { relativeTime, displayName, accountStatus, ACCOUNT_ACTIVE_DAYS } from "../lib/format";

const SORTS = {
  newest: { label: "Newest users", fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  oldest: { label: "Oldest users", fn: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) },
  name_az: { label: "Name A–Z", fn: (a, b) => displayName(a).localeCompare(displayName(b)) },
  name_za: { label: "Name Z–A", fn: (a, b) => displayName(b).localeCompare(displayName(a)) },
  recent_active: { label: "Recently active", fn: (a, b) => ts(b.lastActiveAt) - ts(a.lastActiveAt) },
  least_active: { label: "Least recently active", fn: (a, b) => ts(a.lastActiveAt) - ts(b.lastActiveAt) },
};

const ts = (v) => (v ? new Date(v).getTime() : 0);

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  const loadUsers = useCallback(() => {
    api
      .get("/users")
      .then((res) => { setUsers(res.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load users"));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const visible = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    let list = users.filter((u) => {
      if (q) {
        const hay = `${u.name || ""} ${u.username || ""} ${u.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all") {
        const isActive = accountStatus(u.lastLoginAt).active;
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;
      }
      return true;
    });
    return list.sort(SORTS[sort].fn);
  }, [users, search, sort, statusFilter]);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Users</h1>
        <p className="page-sub" style={{ marginBottom: 20 }}>
          Status is automatic — logged in within {ACCOUNT_ACTIVE_DAYS} days = Active.
        </p>

        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search by name, username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        <div className="card">
          <StateBlock
            loading={!users && !error}
            error={error}
            empty={users && visible.length === 0}
            emptyText={users && users.length ? "No users match your filters." : "No users yet."}
          >
            <table className="rows">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const st = accountStatus(u.lastLoginAt);
                  return (
                    <tr key={u._id} className="clickable" onClick={() => navigate(`/users/${u._id}`)}>
                      <td className="user-cell">
                        <Avatar user={u} />
                        <div className="user-id">
                          <span className="user-id-name">{displayName(u)}</span>
                          <span className="user-id-handle">@{u.username}</span>
                        </div>
                      </td>
                      <td className="muted">{u.email}</td>
                      <td><span className={`badge ${st.className}`}>{st.label}</span></td>
                      <td className="muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : "Never"}</td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={(e) => { e.stopPropagation(); navigate(`/users/${u._id}`); }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </StateBlock>
          {users && visible.length > 0 && (
            <div className="table-foot">{visible.length} of {users.length} users</div>
          )}
        </div>
      </div>
    </div>
  );
}
