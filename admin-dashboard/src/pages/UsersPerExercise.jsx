import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Section, StateBlock, Avatar } from "../components/ui";
import api from "../lib/api";
import { exerciseLabel, relativeTime, displayName } from "../lib/format";

const PAGE_SIZE = 20;

export default function UsersPerExercise() {
  const navigate = useNavigate();

  const [usage, setUsage] = useState(null);
  const [usageError, setUsageError] = useState("");

  const [selected, setSelected] = useState(null); // exercise key
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState(null); // { users, total, page }
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // load exercise cards
  useEffect(() => {
    api
      .get("/exercise-usage")
      .then((res) => { setUsage(res.data); setUsageError(""); })
      .catch((err) => setUsageError(err.response?.data?.message || "Failed to load exercises"));
  }, []);

  const loadDetail = useCallback((exercise, pageNum, searchTerm) => {
    setDetailLoading(true);
    api
      .get(`/exercise-usage/${encodeURIComponent(exercise)}/users`, {
        params: { page: pageNum, limit: PAGE_SIZE, search: searchTerm || undefined },
      })
      .then((res) => { setDetail(res.data); setDetailError(""); })
      .catch((err) => setDetailError(err.response?.data?.message || "Failed to load users"))
      .finally(() => setDetailLoading(false));
  }, []);

  // debounce search / react to page + selection changes
  const firstRun = useRef(true);
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => loadDetail(selected, page, search), firstRun.current ? 0 : 250);
    firstRun.current = false;
    return () => clearTimeout(t);
  }, [selected, page, search, loadDetail]);

  const openExercise = (exercise) => {
    firstRun.current = true;
    setSearch("");
    setPage(1);
    setDetail(null);
    setSelected(exercise);
  };

  const closeDetail = () => { setSelected(null); setDetail(null); };

  const totalPages = detail ? Math.max(1, Math.ceil(detail.total / PAGE_SIZE)) : 1;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Users per Exercise</h1>

        {!selected ? (
          <Section
            title="Exercises"
            subtitle="Select an exercise to see the users who have done it"
          >
            <StateBlock
              loading={!usage && !usageError}
              error={usageError}
              empty={usage && usage.length === 0}
              emptyText="No workout records yet."
            >
              <div className="ex-grid">
                {usage?.map((e) => (
                  <button key={e.exercise} className="ex-card" onClick={() => openExercise(e.exercise)}>
                    <div className="ex-card-name">{exerciseLabel(e.exercise)}</div>
                    <div className="ex-card-count">{e.userCount}</div>
                    <div className="ex-card-sub">
                      {e.userCount === 1 ? "user" : "users"} · {e.sessions} sessions
                    </div>
                  </button>
                ))}
              </div>
            </StateBlock>
          </Section>
        ) : (
          <Section
            title={exerciseLabel(selected)}
            subtitle={detail ? `${detail.total} ${detail.total === 1 ? "user" : "users"}` : "Loading…"}
            actions={
              <button className="btn-small" onClick={closeDetail}>← All exercises</button>
            }
          >
            <div className="toolbar">
              <input
                className="search-input"
                placeholder="Search by name, username or email…"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              />
            </div>

            <div className="card">
              <StateBlock
                loading={detailLoading && !detail}
                error={detailError}
                empty={detail && detail.users.length === 0}
                emptyText={search ? "No users match your search." : "No users for this exercise."}
              >
                <table className="rows">
                  <thead>
                    <tr><th>User</th><th>Email</th><th>Sessions</th><th>Last used</th></tr>
                  </thead>
                  <tbody>
                    {detail?.users.map((u) => (
                      <tr key={u.userId} className="clickable" onClick={() => navigate(`/users/${u.userId}`)}>
                        <td className="user-cell"><Avatar user={u} /> {displayName(u)}</td>
                        <td className="muted">{u.email || "—"}</td>
                        <td>{u.sessions}</td>
                        <td className="muted">{relativeTime(u.lastUsed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {detail && detail.total > PAGE_SIZE && (
                  <div className="pager">
                    <button className="btn-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </button>
                    <span className="pager-info">Page {page} of {totalPages}</span>
                    <button className="btn-small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </button>
                  </div>
                )}
              </StateBlock>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
