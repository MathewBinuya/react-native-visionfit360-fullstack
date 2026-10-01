import { presenceMeta, displayName } from "../lib/format";

export function Section({ id, title, subtitle, actions, children }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

// loading / empty / error states for any block
export function StateBlock({ loading, error, empty, emptyText = "Nothing here yet.", children }) {
  if (loading) return <div className="state state-loading"><span className="spinner" /> Loading…</div>;
  if (error) return <div className="state state-error">{error}</div>;
  if (empty) return <div className="state state-empty">{emptyText}</div>;
  return children;
}

export function PresenceBadge({ status }) {
  const meta = presenceMeta(status);
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}

export function Avatar({ user, size = 32 }) {
  const name = displayName(user);
  const initial = name.charAt(0).toUpperCase();
  if (user?.photo) {
    return <img className="avatar" src={user.photo} alt={name} style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </span>
  );
}

export function RatingStars({ value }) {
  const full = Math.round(value);
  return (
    <span className="stars" title={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= full ? "star on" : "star"}>★</span>
      ))}
    </span>
  );
}
