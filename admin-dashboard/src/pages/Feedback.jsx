import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Avatar, RatingStars, StateBlock, Pagination, TableScroll } from "../components/ui";
import api from "../lib/api";
import { relativeTime, dateTime, displayName } from "../lib/format";

const PAGE_SIZE = 10;

export default function Feedback() {
  const navigate = useNavigate();
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback((p) => {
    api
      .get("/feedback", { params: { page: p, limit: PAGE_SIZE } })
      .then((res) => { setResp(res.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load feedback"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const items = resp?.data || [];

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Feedback</h1>
        <p className="page-sub" style={{ marginBottom: 20 }}>
          User-submitted feedback from the mobile app — newest first.
        </p>

        <div className="card">
          <StateBlock
            loading={loading && !resp}
            error={error}
            empty={resp && items.length === 0}
            emptyText="No feedback submitted yet."
          >
            <TableScroll>
              <table className="rows">
                <thead>
                  <tr>
                    <th>User</th>
                    <th className="col-center">Rating</th>
                    <th>Message</th>
                    <th className="col-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((f) => (
                    <tr
                      key={f._id}
                      className={f.user ? "clickable" : ""}
                      onClick={() => f.user && navigate(`/users/${f.user._id}`)}
                    >
                      <td>
                        <span className="user-cell">
                          <Avatar user={f.user} /> {displayName(f.user)}
                        </span>
                      </td>
                      <td className="col-center"><RatingStars value={f.rating} /></td>
                      <td className="muted feedback-message">{f.comment ? f.comment : "—"}</td>
                      <td className="muted col-right" title={dateTime(f.createdAt)}>
                        {relativeTime(f.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </StateBlock>
          {resp && items.length > 0 && (
            <Pagination
              page={resp.page}
              totalPages={resp.totalPages}
              total={resp.total}
              label="feedback"
              onPage={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
