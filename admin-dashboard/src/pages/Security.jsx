import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import Sidebar from "../components/Sidebar";
import { StateBlock } from "../components/ui";
import api from "../lib/api";

// Authenticator-app setup. Only reachable after a full sign-in, so only the
// admin can link an authenticator to the account.
export default function Security() {
  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [setup, setSetup] = useState(null); // { secret, qr }
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState(null); // "regen" | "disable"
  const [backupCodes, setBackupCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
        .get("/security/2fa")
        .then((res) => { setStatus(res.data); setLoadError(""); })
        .catch((err) => setLoadError(err.response?.data?.message || "Couldn't load security settings")),
    []
  );

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (err) { setError(err.response?.data?.message || "Something went wrong"); } finally { setBusy(false); }
  };

  const startSetup = () => run(async () => {
    const res = await api.post("/security/2fa/setup");
    const qr = await QRCode.toDataURL(res.data.otpauthUrl, { width: 220, margin: 1 });
    setSetup({ secret: res.data.secret, qr });
    setCode("");
  });

  const confirmSetup = (e) => {
    e.preventDefault();
    run(async () => {
      const res = await api.post("/security/2fa/enable", { code });
      setSetup(null);
      setCode("");
      setBackupCodes(res.data.backupCodes);
      await load();
    });
  };

  const regenerate = (e) => {
    e.preventDefault();
    run(async () => {
      const res = await api.post("/security/2fa/backup-codes", { code });
      setMode(null);
      setCode("");
      setBackupCodes(res.data.backupCodes);
      await load();
    });
  };

  const disable = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post("/security/2fa/disable", { password, code });
      setMode(null);
      setCode("");
      setPassword("");
      setBackupCodes(null);
      await load();
    });
  };

  const copyCodes = () => navigator.clipboard?.writeText(backupCodes.join("\n"));
  const downloadCodes = () => {
    const blob = new Blob(
      [`VisionFIT360 admin backup codes (${status?.account})\nEach code works once.\n\n${backupCodes.join("\n")}\n`],
      { type: "text/plain" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "visionfit360-admin-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const codeInput = (
    <input
      className="sec-code"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={mode === "disable" ? 9 : 6}
      value={code}
      onChange={(e) => setCode(mode === "disable" ? e.target.value.slice(0, 9) : e.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder={mode === "disable" ? "123456 or abcd-1234" : "123456"}
      autoFocus
      required
    />
  );

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <h1 className="page-title">Security</h1>

        <StateBlock loading={!status && !loadError} error={loadError}>
          {status && (
            <>
              {backupCodes && (
                <div className="card sec-card">
                  <div className="card-title">Save your backup codes</div>
                  <p className="sec-text">
                    If you lose your phone, each of these codes lets you sign in once. They won't be shown again —
                    download or copy them and keep them somewhere safe (not on the same phone).
                  </p>
                  <div className="sec-codes">
                    {backupCodes.map((c) => <code key={c}>{c}</code>)}
                  </div>
                  <div className="sec-actions">
                    <button className="btn-small" onClick={downloadCodes}>Download .txt</button>
                    <button className="btn-ghost" onClick={copyCodes}>Copy</button>
                    <button className="btn-ghost" onClick={() => setBackupCodes(null)}>I saved them</button>
                  </div>
                </div>
              )}

              <div className="card sec-card">
                <div className="sec-head">
                  <div>
                    <div className="card-title" style={{ marginBottom: 4 }}>Authenticator app</div>
                    <p className="sec-text">
                      Sign in with a code from Google Authenticator, Microsoft Authenticator or Authy — a fallback
                      when the email code doesn't arrive.
                    </p>
                  </div>
                  <span className={`badge ${status.enabled ? "badge-presence-active" : "badge-presence-inactive"}`}>
                    {status.enabled ? "On" : "Off"}
                  </span>
                </div>

                {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

                {!status.enabled && !setup && (
                  <button className="btn-small" onClick={startSetup} disabled={busy} style={{ marginTop: 14 }}>
                    {busy ? "Preparing..." : "Set up authenticator"}
                  </button>
                )}

                {!status.enabled && setup && (
                  <div className="sec-setup">
                    <div className="sec-step">
                      <div className="sec-step-title">1. Scan this QR code</div>
                      <p className="sec-text">In your authenticator app, tap <b>+</b> → <b>Scan a QR code</b>.</p>
                      <img src={setup.qr} alt="Authenticator QR code" className="sec-qr" />
                      <p className="sec-text">Can't scan? Enter this key manually (time-based):</p>
                      <code className="sec-secret">{setup.secret.match(/.{1,4}/g).join(" ")}</code>
                    </div>
                    <form className="sec-step" onSubmit={confirmSetup}>
                      <div className="sec-step-title">2. Enter the 6-digit code from the app</div>
                      {codeInput}
                      <div className="sec-actions">
                        <button className="btn-small" type="submit" disabled={busy || code.length !== 6}>
                          {busy ? "Checking..." : "Turn on"}
                        </button>
                        <button className="btn-ghost" type="button" onClick={() => { setSetup(null); setError(""); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {status.enabled && (
                  <>
                    <p className="sec-text" style={{ marginTop: 12 }}>
                      Backup codes left: <b>{status.backupCodesLeft}</b>
                      {status.backupCodesLeft <= 2 && " — generate new ones soon."}
                    </p>

                    {!mode && (
                      <div className="sec-actions">
                        <button className="btn-ghost" onClick={() => { setMode("regen"); setCode(""); setError(""); }}>New backup codes</button>
                        <button className="btn-danger" onClick={() => { setMode("disable"); setCode(""); setError(""); }}>Turn off</button>
                      </div>
                    )}

                    {mode === "regen" && (
                      <form className="sec-step" onSubmit={regenerate}>
                        <div className="sec-step-title">Enter a current code from your authenticator app</div>
                        <p className="sec-text">Your old backup codes will stop working.</p>
                        {codeInput}
                        <div className="sec-actions">
                          <button className="btn-small" type="submit" disabled={busy || code.length !== 6}>Generate</button>
                          <button className="btn-ghost" type="button" onClick={() => setMode(null)}>Cancel</button>
                        </div>
                      </form>
                    )}

                    {mode === "disable" && (
                      <form className="sec-step" onSubmit={disable}>
                        <div className="sec-step-title">Turn off the authenticator</div>
                        <p className="sec-text">Enter your admin password and an authenticator code (or a backup code).</p>
                        <input
                          className="sec-input"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Admin password"
                          required
                        />
                        {codeInput}
                        <div className="sec-actions">
                          <button className="btn-danger" type="submit" disabled={busy || !password || !code}>Turn off</button>
                          <button className="btn-ghost" type="button" onClick={() => setMode(null)}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>

              <div className="card sec-card">
                <div className="card-title" style={{ marginBottom: 4 }}>Email code</div>
                <p className="sec-text">
                  Always on. Every sign-in sends a 6-digit code to <b>{status.account}</b>.
                </p>
              </div>
            </>
          )}
        </StateBlock>
      </main>
    </div>
  );
}
