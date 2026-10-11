import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

// Two-step sign-in: password, then a 6-digit code — from the admin inbox, the
// authenticator app (if set up in Security), or a one-time backup code.
const METHOD_COPY = {
  email: { label: "Email code", hint: (to) => `Enter the 6-digit code sent to ${to}` },
  app: { label: "Authenticator code", hint: () => "Enter the 6-digit code from your authenticator app" },
  backup: { label: "Backup code", hint: () => "Enter one of your saved backup codes (e.g. abcd-1234)" },
};

export default function Login() {
  const [step, setStep] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [methods, setMethods] = useState({ email: true, app: false, backup: false });
  const [method, setMethod] = useState("email");
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const enterCodeStep = (data) => {
    const m = data.methods || { email: true };
    setChallenge(data.challenge);
    setSentTo(data.email);
    setMethods(m);
    setResendIn(data.resendInSeconds ?? 60);
    setCode("");
    setStep("code");
    if (!m.email && m.app) {
      setMethod("app");
      setInfo("The email code couldn't be sent. Use your authenticator app.");
    } else {
      setMethod("email");
    }
  };

  const switchMethod = (m) => {
    setMethod(m);
    setCode("");
    setError("");
    setInfo("");
  };

  const backToPassword = (message = "") => {
    setStep("password");
    setChallenge("");
    setCode("");
    setInfo("");
    setError(message);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await api.post("/login", { email, password });
      enterCodeStep(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await api.post("/login/verify", { challenge, code, method });
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminName", res.data.admin.name);
      navigate("/dashboard");
    } catch (err) {
      const data = err.response?.data || {};
      if (data.restart) backToPassword(data.message);
      else setError(data.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    try {
      const res = await api.post("/login/resend", { challenge });
      enterCodeStep(res.data);
      setInfo("A new code was sent.");
    } catch (err) {
      const data = err.response?.data || {};
      if (data.restart) return backToPassword(data.message);
      if (data.resendInSeconds) setResendIn(data.resendInSeconds);
      setError(data.message || "Couldn't resend the code");
    }
  };

  if (step === "code") {
    const isBackup = method === "backup";
    const ready = isBackup ? code.replace(/[^a-z0-9]/gi, "").length === 8 : code.length === 6;
    const others = ["email", "app", "backup"].filter((m) => m !== method && (m === "email" || methods[m]));

    return (
      <div className="login-wrap">
        <form className="login-card" onSubmit={handleVerify}>
          <h1>VisionFIT360</h1>
          <p className="subtitle">{METHOD_COPY[method].hint(sentTo)}</p>

          {error && <div className="error">{error}</div>}
          {info && <div className="notice">{info}</div>}

          <label>{METHOD_COPY[method].label}</label>
          <input
            className="otp-input"
            type="text"
            inputMode={isBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            maxLength={isBackup ? 9 : 6}
            value={code}
            onChange={(e) =>
              setCode(isBackup ? e.target.value.toLowerCase().slice(0, 9) : e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder={isBackup ? "abcd-1234" : "••••••"}
            autoFocus
            required
          />

          <button type="submit" disabled={loading || !ready}>
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>

          <div className="login-links">
            <button type="button" className="link-btn" onClick={() => backToPassword()}>
              ← Back
            </button>
            {method === "email" && (
              <button type="button" className="link-btn" onClick={handleResend} disabled={resendIn > 0}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
            )}
          </div>

          {others.map((m) => (
            <button key={m} type="button" className="link-btn login-switch" onClick={() => switchMethod(m)}>
              {m === "email" ? "Use the email code instead" : m === "app" ? "Use authenticator app instead" : "Use a backup code"}
            </button>
          ))}

          {method === "email" && <p className="login-hint">Code expires in 10 minutes. Check Spam if it doesn't arrive.</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleLogin}>
        <h1>VisionFIT360</h1>
        <p className="subtitle">Admin Dashboard</p>

        {error && <div className="error">{error}</div>}

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Admin User"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending code..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
