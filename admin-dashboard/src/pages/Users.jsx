import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Avatar, StateBlock, Pagination, TableScroll } from "../components/ui";
import api from "../lib/api";
import { relativeTime, displayName, accountStatus, lastSeen, ACCOUNT_ACTIVE_DAYS } from "../lib/format";

const PAGE_SIZE = 10;

const SORTS = {
  newest: "Newest users",
  oldest: "Oldest users",
  name_az: "Name A–Z",
  name_za: "Name Z–A",
  recent_active: "Recently active",
  least_active: "Least recently active",
};

export default function Users() {
  const navigate = useNavigate();
  const [resp, setResp] = useState(null); // { data, page, totalPages, total, ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [page, setPage] = useState(1);

  const load = useCallback((params) => {
    setLoading(true);
    api
      .get("/users", { params })
      .then((res) => { setResp(res.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  // debounce search; react to filter/page changes
  const first = useRef(true);
  useEffect(() => {
    const params = {
      page,
      limit: PAGE_SIZE,
      sort,
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    };
    const t = setTimeout(() => load(params), first.current ? 0 : 250);
    first.current = false;
    return () => clearTimeout(t);
  }, [page, sort, search, statusFilter, load]);

  const users = resp?.data || [];

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Users</h1>
        <p className="page-sub" style={{ marginBottom: 20 }}>
          Status is automatic — active in the app within {ACCOUNT_ACTIVE_DAYS} days = Active.
        </p>

        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search by name, username or email…"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          />
          <select className="select" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <select className="select" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        <div className="card">
          <StateBlock
            loading={loading && !resp}
            error={error}
            empty={resp && users.length === 0}
            emptyText={search || statusFilter !== "all" ? "No users match your filters." : "No users yet."}
          >
            <TableScroll>
              <table className="rows">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th className="col-center">Status</th>
                    <th className="col-right">Last active</th>
                    <th className="col-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const st = accountStatus(u);
                    const seen = lastSeen(u);
                    return (
                      <tr key={u._id} className="clickable" onClick={() => navigate(`/users/${u._id}`)}>
                        <td>
                          <div className="user-cell">
                            <Avatar user={u} />
                            <div className="user-id">
                              <span className="user-id-name">{displayName(u)}</span>
                              <span className="user-id-handle">@{u.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="muted">{u.email}</td>
                        <td className="col-center"><span className={`badge ${st.className}`}>{st.label}</span></td>
                        <td className="muted col-right">{seen ? relativeTime(seen) : "Never"}</td>
                        <td className="col-right">
                          <button
                            className="btn-ghost"
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
            </TableScroll>
          </StateBlock>
          {resp && users.length > 0 && (
            <Pagination
              page={resp.page}
              totalPages={resp.totalPages}
              total={resp.total}
              label="users"
              onPage={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
