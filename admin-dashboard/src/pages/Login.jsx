import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

// Two-step sign-in: password, then the 6-digit code emailed to the admin inbox.
export default function Login() {
  const [step, setStep] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [sentTo, setSentTo] = useState("");
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
    setChallenge(data.challenge);
    setSentTo(data.email);
    setResendIn(data.resendInSeconds ?? 60);
    setCode("");
    setStep("code");
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
      const res = await api.post("/login/verify", { challenge, code });
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
    return (
      <div className="login-wrap">
        <form className="login-card" onSubmit={handleVerify}>
          <h1>VisionFIT360</h1>
          <p className="subtitle">Enter the 6-digit code sent to {sentTo}</p>

          {error && <div className="error">{error}</div>}
          {info && <div className="notice">{info}</div>}

          <label>Login code</label>
          <input
            className="otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            autoFocus
            required
          />

          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>

          <div className="login-links">
            <button type="button" className="link-btn" onClick={() => backToPassword()}>
              ← Back
            </button>
            <button type="button" className="link-btn" onClick={handleResend} disabled={resendIn > 0}>
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
          </div>
          <p className="login-hint">Code expires in 10 minutes. Check Spam if it doesn't arrive.</p>
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
          placeholder="visionfit360@gmail.com"
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
