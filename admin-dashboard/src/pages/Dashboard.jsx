import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Section, StatCard, StateBlock, PresenceBadge, Avatar, RatingStars } from "../components/ui";
import { LineChart, BarChart } from "../components/Charts";
import api from "../lib/api";
import { exerciseLabel, relativeTime, displayName } from "../lib/format";

const PRESENCE_POLL_MS = 20000; // how often the dashboard refreshes presence
const EXERCISE_PREVIEW = 8;     // top-N exercises shown on the dashboard (full list lives on its own page)

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const GENDER_ORDER = ["male", "female", "other", "Not specified"];
const AGE_ORDER = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55+", "Not specified"];
const BMI_ORDER = ["Underweight", "Normal", "Overweight", "Obese", "Not specified"];

// turn a [{_id,count}] breakdown into ordered BarChart rows
const toBars = (arr, order, labelFn = (x) => x) => {
  const map = new Map((arr || []).map((d) => [d._id, d.count]));
  const rows = order.filter((k) => map.has(k)).map((k) => ({ label: labelFn(k), value: map.get(k) }));
  for (const d of arr || []) if (!order.includes(d._id)) rows.push({ label: labelFn(d._id), value: d.count });
  return rows;
};

function Breakdown({ rows }) {
  if (!rows.length) return <div className="state state-empty">No data</div>;
  return <BarChart data={rows} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState(7);

  const [data, setData] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState("");

  const [presence, setPresence] = useState(null);
  const [presError, setPresError] = useState("");

  const loadDashboard = useCallback((r) => {
    // loading spinner only matters on first load (data === null); on range change we
    // keep showing the current data to avoid flicker, so no synchronous setState here.
    api
      .get(`/dashboard?range=${r}`)
      .then((res) => { setData(res.data); setDashError(""); })
      .catch((err) => setDashError(err.response?.data?.message || "Failed to load dashboard"))
      .finally(() => setDashLoading(false));
  }, []);

  const loadPresence = useCallback(() => {
    api
      .get("/presence")
      .then((res) => { setPresence(res.data); setPresError(""); })
      .catch((err) => setPresError(err.response?.data?.message || "Failed to load presence"));
  }, []);

  useEffect(() => { loadDashboard(range); }, [range, loadDashboard]);

  useEffect(() => {
    loadPresence();
    const id = setInterval(loadPresence, PRESENCE_POLL_MS);
    return () => clearInterval(id);
  }, [loadPresence]);

  const goUser = (id) => id && navigate(`/users/${id}`);

  const k = data?.kpis;
  const counts = presence?.counts;
  const activeList = (presence?.users || []).filter((u) => u.status === "active");
  const recentList = (presence?.users || []).filter((u) => u.status === "recently_active");

  const rep = data?.workouts?.repQuality;
  const repTotal = rep ? (rep.good || 0) + (rep.bad || 0) : 0;

  const demo = data?.demographics || {};
  const body = demo.body;
  const exercisePreview = (data?.workouts?.exerciseUsage || []).slice(0, EXERCISE_PREVIEW);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <div className="page-head">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">
              {data?.generatedAt ? `Updated ${relativeTime(data.generatedAt)}` : "Loading…"}
              {presence && (
                <> · <span className="live-dot" /> {counts?.active ?? 0} active now</>
              )}
            </p>
          </div>
          <div className="range-toggle" role="group" aria-label="Trend range">
            {[7, 30].map((r) => (
              <button
                key={r}
                className={range === r ? "active" : ""}
                onClick={() => setRange(r)}
              >
                {r} days
              </button>
            ))}
          </div>
        </div>

        {/* ===== USERS ===== */}
        <Section
          title="Users"
          subtitle="Accounts and presence snapshot"
          actions={<button className="link-btn" onClick={() => navigate("/users")}>View all users →</button>}
        >
          <StateBlock loading={dashLoading && !data} error={dashError}>
            <div className="stat-grid">
              <StatCard label="Total Users" value={k?.totalUsers ?? "—"} />
              <StatCard label="Active now" value={counts?.active ?? "—"} hint="seen in last 2 min" />
              <StatCard label="Recently active" value={counts?.recentlyActive ?? "—"} hint="seen in last 15 min" />
              <StatCard label="Inactive" value={counts?.inactive ?? "—"} hint="older / never" />
            </div>
          </StateBlock>
        </Section>

        {/* ===== DEMOGRAPHICS ===== */}
        <Section title="Demographics" subtitle="Who your users are — missing data shown as “Not specified”">
          <StateBlock loading={dashLoading && !data} error={dashError}>
            <div className="demo-grid">
              <div className="card">
                <h3 className="card-title">Gender</h3>
                <Breakdown rows={toBars(demo.gender, GENDER_ORDER, cap)} />
              </div>
              <div className="card">
                <h3 className="card-title">Age groups</h3>
                <Breakdown rows={toBars(demo.ageGroups, AGE_ORDER)} />
              </div>
              <div className="card">
                <h3 className="card-title">BMI categories</h3>
                <Breakdown rows={toBars(demo.bmiCategories, BMI_ORDER)} />
              </div>
            </div>
            <div className="card">
              <h3 className="card-title">Body summary</h3>
              <div className="mini-stats">
                <div><span>Avg height</span><strong>{body?.avgHeight ? `${Math.round(body.avgHeight)} cm` : "—"}</strong></div>
                <div><span>Avg weight</span><strong>{body?.avgWeight ? `${Math.round(body.avgWeight)} kg` : "—"}</strong></div>
                <div><span>Height on file</span><strong>{body?.withHeight ?? 0}</strong></div>
                <div><span>Weight on file</span><strong>{body?.withWeight ?? 0}</strong></div>
              </div>
            </div>
          </StateBlock>
        </Section>

        {/* ===== ACTIVITY ===== */}
        <Section
          title="Activity & presence"
          subtitle='"Active" means seen recently — not a guaranteed live connection.'
        >
          {presError && <div className="state state-error">{presError}</div>}
          <div className="two-col">
            <div className="card">
              <h3 className="card-title">Currently / recently active</h3>
              <StateBlock
                loading={!presence}
                empty={presence && activeList.length === 0 && recentList.length === 0}
                emptyText="No one active recently."
              >
                <ul className="people">
                  {[...activeList, ...recentList].slice(0, 20).map((u) => (
                    <li key={u._id} className="person clickable" onClick={() => goUser(u._id)}>
                      <Avatar user={u} />
                      <span className="person-name">{displayName(u)}</span>
                      <PresenceBadge status={u.status} />
                      <span className="person-time">{relativeTime(u.lastActiveAt)}</span>
                    </li>
                  ))}
                </ul>
              </StateBlock>
            </div>

            <div className="card">
              <h3 className="card-title">Recent logins</h3>
              <StateBlock
                loading={dashLoading && !data}
                empty={!data?.logins?.recent?.length}
                emptyText="No logins recorded yet."
              >
                <ul className="people">
                  {data?.logins?.recent?.map((ev) => (
                    <li key={ev._id} className="person clickable" onClick={() => goUser(ev.user?._id)}>
                      <Avatar user={ev.user} />
                      <span className="person-name">{displayName(ev.user)}</span>
                      <span className="person-time">{relativeTime(ev.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </StateBlock>
            </div>
          </div>
        </Section>

        {/* ===== WORKOUTS ===== */}
        <Section
          title="Workouts"
          subtitle="Usage across exercises"
          actions={<button className="link-btn" onClick={() => navigate("/users-per-exercise")}>Users per exercise →</button>}
        >
          <StateBlock loading={dashLoading && !data} error={dashError}>
            <div className="stat-grid">
              <StatCard label="Total sessions" value={k?.totalSessions ?? "—"} />
              <StatCard label={`Sessions (last ${range}d)`} value={k?.sessionsInRange ?? "—"} />
              <StatCard
                label="Form quality"
                value={repTotal ? `${Math.round((rep.good / repTotal) * 100)}%` : "—"}
                hint={repTotal ? `${rep.good} good · ${rep.bad} bad reps` : "no AR form data yet"}
              />
            </div>

            <div className="card">
              <h3 className="card-title">Top exercises by users</h3>
              <StateBlock
                empty={!exercisePreview.length}
                emptyText="No workout records yet."
              >
                <BarChart
                  data={exercisePreview.map((e) => ({
                    label: exerciseLabel(e.exercise),
                    value: e.userCount,
                    sub: `${e.sessions} sessions`,
                  }))}
                />
              </StateBlock>
            </div>
          </StateBlock>
        </Section>

        {/* ===== ANALYTICS ===== */}
        <Section title="Analytics" subtitle={`Trends over the last ${range} days`}>
          <StateBlock loading={dashLoading && !data} error={dashError}>
            <div className="stat-grid">
              <StatCard label="New users" value={k?.newUsers ?? "—"} hint={`last ${range}d`} />
              <StatCard label="Active users" value={k?.activeUsers ?? "—"} hint="seen in last 15 min" />
              <StatCard label="Sessions" value={k?.sessionsInRange ?? "—"} hint={`last ${range}d`} />
              <StatCard label="Avg rating" value={k?.avgRating ? `${k.avgRating}/5` : "—"} hint={`${k?.feedbackCount ?? 0} reviews`} />
            </div>

            <div className="two-col">
              <div className="card">
                <h3 className="card-title">New users over time</h3>
                <StateBlock empty={!data?.analytics?.newUsersTrend?.length} emptyText="No sign-ups in this range.">
                  <LineChart data={data?.analytics?.newUsersTrend || []} />
                </StateBlock>
              </div>
              <div className="card">
                <h3 className="card-title">Workout usage over time</h3>
                <StateBlock empty={!data?.workouts?.usageTrend?.length} emptyText="No sessions in this range.">
                  <LineChart data={data?.workouts?.usageTrend || []} />
                </StateBlock>
              </div>
            </div>
          </StateBlock>
        </Section>

        {/* ===== FEEDBACK ===== */}
        <Section title="Feedback" subtitle="What users are saying">
          <StateBlock loading={dashLoading && !data} error={dashError}>
            <div className="feedback-head">
              <div className="feedback-score">
                <div className="score-num">{data?.feedback?.avgRating || 0}</div>
                <div>
                  <RatingStars value={data?.feedback?.avgRating || 0} />
                  <div className="muted">{data?.feedback?.count || 0} reviews</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Recent feedback</h3>
              <StateBlock empty={!data?.feedback?.recent?.length} emptyText="No feedback submitted yet.">
                <ul className="feedback-list">
                  {data?.feedback?.recent?.map((f) => (
                    <li key={f._id} className="feedback-item">
                      <div className="feedback-item-head">
                        <span
                          className="user-cell clickable"
                          onClick={() => goUser(f.user?._id)}
                        >
                          <Avatar user={f.user} /> {displayName(f.user)}
                        </span>
                        <RatingStars value={f.rating} />
                        <span className="person-time">{relativeTime(f.createdAt)}</span>
                      </div>
                      {f.comment ? <p className="feedback-comment">{f.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              </StateBlock>
            </div>
          </StateBlock>
        </Section>
      </div>
    </div>
  );
}
