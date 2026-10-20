import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { StatCard, StateBlock, Section, TableScroll } from "../components/ui";
import { LineChart } from "../components/Charts";
import api from "../lib/api";

const TABS = ["Recent", "Monthly", "Yearly", "Date"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const todayISO = () => {
  const now = new Date();
  const manila = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return manila.toISOString().slice(0, 10);
};

// ---------- Recent (existing 7 / 30 day analytics) ----------
function RecentView() {
  const [d7, setD7] = useState(null);
  const [d30, setD30] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/dashboard?range=7"), api.get("/dashboard?range=30")])
      .then(([a, b]) => { setD7(a.data); setD30(b.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StateBlock loading={loading && !d7} error={error}>
      <div className="analytics-tiles">
        <StatCard label="New users · 7 days" value={d7?.kpis?.newUsers ?? "—"} />
        <StatCard label="Completed sessions · 7 days" value={d7?.kpis?.sessionsInRange ?? "—"} />
        <StatCard label="New users · 30 days" value={d30?.kpis?.newUsers ?? "—"} />
        <StatCard label="Completed sessions · 30 days" value={d30?.kpis?.sessionsInRange ?? "—"} />
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 className="card-title">New users · last 30 days</h3>
          <StateBlock empty={!d30?.analytics?.newUsersTrend?.length} emptyText="No sign-ups in this range.">
            <LineChart data={d30?.analytics?.newUsersTrend || []} />
          </StateBlock>
        </div>
        <div className="card">
          <h3 className="card-title">Completed sessions · last 30 days</h3>
          <StateBlock empty={!d30?.workouts?.usageTrend?.length} emptyText="No sessions in this range.">
            <LineChart data={d30?.workouts?.usageTrend || []} />
          </StateBlock>
        </div>
      </div>
    </StateBlock>
  );
}

// ---------- Monthly (weekly breakdown + totals) ----------
function MonthlyView({ years }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get("/analytics/monthly", { params: { year, month } })
      .then((res) => { setData(res.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load monthly analytics"))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="toolbar">
        <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="card">
        <h3 className="card-title">{MONTHS[month - 1]} {year}</h3>
        <StateBlock loading={loading && !data} error={error} empty={data && data.weeks.length === 0} emptyText="No data for this month.">
          <TableScroll>
            <table className="rows">
              <thead>
                <tr>
                  <th>Week</th>
                  <th className="col-right">New Users</th>
                  <th className="col-right">Completed Sessions</th>
                </tr>
              </thead>
              <tbody>
                {data?.weeks.map((w) => (
                  <tr key={w.week}>
                    <td>{w.label} <span className="muted">(day {w.fromDay}–{w.toDay})</span></td>
                    <td className="col-right">{w.newUsers}</td>
                    <td className="col-right">{w.completedSessions}</td>
                  </tr>
                ))}
              </tbody>
              {data && (
                <tfoot>
                  <tr className="row-total">
                    <td>Total</td>
                    <td className="col-right">{data.totals.newUsers}</td>
                    <td className="col-right">{data.totals.completedSessions}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </TableScroll>
        </StateBlock>
      </div>
    </>
  );
}

// ---------- Yearly (Jan–Dec breakdown + totals) ----------
function YearlyView({ years }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get("/analytics/yearly", { params: { year } })
      .then((res) => { setData(res.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load yearly analytics"))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="toolbar">
        <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="analytics-tiles" style={{ marginBottom: 16 }}>
        <StatCard label={`Total new users · ${year}`} value={data?.totals?.newUsers ?? "—"} />
        <StatCard label={`Total completed sessions · ${year}`} value={data?.totals?.completedSessions ?? "—"} />
      </div>

      <div className="card">
        <h3 className="card-title">{year} by month</h3>
        <StateBlock loading={loading && !data} error={error}>
          <TableScroll>
            <table className="rows">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="col-right">New Users</th>
                  <th className="col-right">Completed Sessions</th>
                </tr>
              </thead>
              <tbody>
                {data?.months.map((m) => (
                  <tr key={m.month}>
                    <td>{m.label}</td>
                    <td className="col-right">{m.newUsers}</td>
                    <td className="col-right">{m.completedSessions}</td>
                  </tr>
                ))}
              </tbody>
              {data && (
                <tfoot>
                  <tr className="row-total">
                    <td>Total</td>
                    <td className="col-right">{data.totals.newUsers}</td>
                    <td className="col-right">{data.totals.completedSessions}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </TableScroll>
        </StateBlock>
      </div>
    </>
  );
}

// ---------- Date (specific day) ----------
function DateView() {
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get("/analytics/daily", { params: { date } })
      .then((res) => { setData(res.data); setError(""); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load date analytics"))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="toolbar">
        <input
          type="date"
          className="select"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <StateBlock loading={loading && !data} error={error}>
        <div className="analytics-tiles">
          <StatCard label="New users" value={data?.newUsers ?? "—"} />
          <StatCard label="Completed sessions" value={data?.completedSessions ?? "—"} />
        </div>
      </StateBlock>
    </>
  );
}

export default function Analytics() {
  const [tab, setTab] = useState("Recent");
  const [years, setYears] = useState([new Date().getFullYear()]);

  useEffect(() => {
    api
      .get("/analytics/years")
      .then((res) => { if (res.data?.years?.length) setYears(res.data.years); })
      .catch(() => { /* keep the current-year fallback */ });
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <h1 className="page-title">Analytics</h1>

        <div className="seg-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <Section
          title={
            tab === "Recent" ? "Recent activity"
              : tab === "Monthly" ? "Monthly breakdown"
                : tab === "Yearly" ? "Yearly breakdown"
                  : "Specific date"
          }
          subtitle={
            tab === "Recent" ? "The last 7 and 30 days."
              : tab === "Monthly" ? "Weekly breakdown for the selected month."
                : tab === "Yearly" ? "Month-by-month totals for the selected year."
                  : "New users and completed sessions on a single day."
          }
        >
          {tab === "Recent" && <RecentView />}
          {tab === "Monthly" && <MonthlyView years={years} />}
          {tab === "Yearly" && <YearlyView years={years} />}
          {tab === "Date" && <DateView />}
        </Section>
      </div>
    </div>
  );
}
