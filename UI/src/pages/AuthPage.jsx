import { useState } from "react";
import {
  Sparkles,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  User,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// ── Reusable field ────────────────────────────────────────────────────
function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
}) {
  const [showPwd, setShowPwd] = useState(false);
  const isPwd = type === "password";
  const inputType = isPwd ? (showPwd ? "text" : "password") : type;

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 6,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon
            size={14}
            color="var(--text-muted)"
            style={{
              position: "absolute",
              left: 13,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
        )}
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: `10px ${isPwd ? "40px" : "12px"} 10px ${Icon ? "36px" : "12px"}`,
            background: "var(--bg-raised)",
            border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
            fontFamily: "var(--font-body)",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => {
            if (!error) e.target.style.borderColor = "var(--border-accent)";
          }}
          onBlur={(e) => {
            if (!error) e.target.style.borderColor = "var(--border)";
          }}
        />
        {isPwd && (
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 5,
            fontSize: 11,
            color: "var(--red)",
          }}
        >
          <AlertCircle size={11} /> {error}
        </div>
      )}
    </div>
  );
}

// ── Password strength meter ───────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "",
    "var(--red)",
    "var(--amber)",
    "var(--blue)",
    "var(--green)",
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= score ? colors[score] : "var(--bg-active)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      <div
        style={{ fontSize: 11, color: colors[score] || "var(--text-muted)" }}
      >
        {score > 0 && labels[score]}
      </div>
    </div>
  );
}

// ── Main Auth page ────────────────────────────────────────────────────
export default function AuthPage({ onAuth, theme, onToggleTheme }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [animating, setAnimating] = useState(false);

  // Sign in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");
  const [siErrors, setSiErrors] = useState({});

  // Sign up fields
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");
  const [suPwd2, setSuPwd2] = useState("");
  const [suErrors, setSuErrors] = useState({});

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // ── Toggle with slide animation ──────────────────────────────────
  const toggle = (target) => {
    if (target === mode || animating) return;
    setAnimating(true);
    setSiErrors({});
    setSuErrors({});
    setSuccess("");
    setTimeout(() => {
      setMode(target);
      setAnimating(false);
    }, 220);
  };

  // ── Validation ───────────────────────────────────────────────────
  const validateSignIn = () => {
    const e = {};
    if (!siEmail.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(siEmail)) e.email = "Enter a valid email";
    if (!siPwd) e.pwd = "Password is required";
    setSiErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateSignUp = () => {
    const e = {};
    if (!suName.trim()) e.name = "Name is required";
    if (!suEmail.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(suEmail)) e.email = "Enter a valid email";
    if (!suPwd) e.pwd = "Password is required";
    else if (suPwd.length < 8) e.pwd = "At least 8 characters";
    if (suPwd !== suPwd2) e.pwd2 = "Passwords do not match";
    setSuErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── API helper ───────────────────────────────────────────────────
  const apiCall = async (path, body) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `Request failed (${res.status})`);
    }
    return data;
  };

  // ── Submit handlers ───────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!validateSignIn()) return;
    setLoading(true);
    setSiErrors({});
    try {
      const data = await apiCall("/api/v1/auth/login", {
        email: siEmail.trim(),
        password: siPwd,
      });
      // Store JWT for subsequent API calls
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      onAuth(data.user);
    } catch (err) {
      setSiErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateSignUp()) return;
    setLoading(true);
    setSuErrors({});
    try {
      const data = await apiCall("/api/v1/auth/register", {
        name: suName.trim(),
        email: suEmail.trim(),
        password: suPwd,
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      setSuccess("Account created! Signing you in…");
      setTimeout(() => onAuth(data.user), 1000);
    } catch (err) {
      setSuErrors({ api: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isSignIn = mode === "signin";

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: "var(--accent-dim)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} color="var(--accent)" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 14,
                color: "var(--text-primary)",
                letterSpacing: "-0.3px",
              }}
            >
              LLM Fine Tune Studio
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Powered by LoRA · Candle · Rust
            </div>
          </div>
        </div>
        <button
          onClick={onToggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border)",
            background: "var(--bg-raised)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {theme === "dark" ? (
            <>
              <Sun size={13} /> Light
            </>
          ) : (
            <>
              <Moon size={13} /> Dark
            </>
          )}
        </button>
      </div>

      {/* ── Center card ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Mode toggle pills */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              marginBottom: 28,
            }}
          >
            {["signin", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => toggle(m)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "var(--radius-md)",
                  border:
                    mode === m
                      ? "1px solid var(--border-accent)"
                      : "1px solid transparent",
                  background: mode === m ? "var(--accent-glow)" : "transparent",
                  color: mode === m ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: mode === m ? 600 : 400,
                  transition: "all 0.2s",
                  fontFamily: "var(--font-body)",
                }}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              padding: "32px",
              opacity: animating ? 0 : 1,
              transform: animating ? "translateY(6px)" : "translateY(0)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.4px",
                  marginBottom: 6,
                }}
              >
                {isSignIn ? "Welcome back" : "Create your account"}
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {isSignIn
                  ? "Sign in to continue to your fine-tuning workspace."
                  : "Start fine-tuning LLMs without writing any code."}
              </p>
            </div>

            {/* Success banner */}
            {success && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--green-dim)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "var(--green)",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <CheckCircle size={14} /> {success}
              </div>
            )}

            {/* ── Sign In form ── */}
            {isSignIn && (
              <>
                <Field
                  label="Email"
                  type="email"
                  value={siEmail}
                  onChange={setSiEmail}
                  placeholder="you@company.com"
                  error={siErrors.email}
                  icon={Mail}
                />
                <Field
                  label="Password"
                  type="password"
                  value={siPwd}
                  onChange={setSiPwd}
                  placeholder="Your password"
                  error={siErrors.pwd}
                  icon={Lock}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 20,
                    marginTop: -8,
                  }}
                >
                  <button
                    style={{
                      fontSize: 12,
                      color: "var(--accent)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {siErrors.api && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--red-dim)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "var(--red)",
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    <AlertCircle size={14} /> {siErrors.api}
                  </div>
                )}
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "11px",
                    background: loading ? "var(--bg-raised)" : "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: "var(--radius-full)",
                    color: loading ? "var(--text-muted)" : "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.15s",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {loading ? (
                    "Signing in…"
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </>
            )}

            {/* ── Sign Up form ── */}
            {!isSignIn && (
              <>
                <Field
                  label="Full name"
                  value={suName}
                  onChange={setSuName}
                  placeholder="Alex Johnson"
                  error={suErrors.name}
                  icon={User}
                />
                <Field
                  label="Email"
                  type="email"
                  value={suEmail}
                  onChange={setSuEmail}
                  placeholder="you@company.com"
                  error={suErrors.email}
                  icon={Mail}
                />
                <Field
                  label="Password"
                  type="password"
                  value={suPwd}
                  onChange={setSuPwd}
                  placeholder="Min. 8 characters"
                  error={suErrors.pwd}
                  icon={Lock}
                />
                <PasswordStrength password={suPwd} />
                <Field
                  label="Confirm password"
                  type="password"
                  value={suPwd2}
                  onChange={setSuPwd2}
                  placeholder="Repeat password"
                  error={suErrors.pwd2}
                  icon={Lock}
                />

                {suErrors.api && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--red-dim)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "var(--red)",
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    <AlertCircle size={14} /> {suErrors.api}
                  </div>
                )}
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "11px",
                    marginTop: 4,
                    background: loading ? "var(--bg-raised)" : "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: "var(--radius-full)",
                    color: loading ? "var(--text-muted)" : "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.15s",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {loading ? (
                    "Creating account…"
                  ) : (
                    <>
                      <span>Create account</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    marginTop: 16,
                    lineHeight: 1.6,
                  }}
                >
                  By signing up you agree to the Terms of Service and Privacy
                  Policy.
                </p>
              </>
            )}

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "24px 0 20px",
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                or
              </span>
              <div
                style={{ flex: 1, height: 1, background: "var(--border)" }}
              />
            </div>

            {/* Toggle link */}
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              {isSignIn
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                onClick={() => toggle(isSignIn ? "signup" : "signin")}
                style={{
                  color: "var(--accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                }}
              >
                {isSignIn ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 24,
            }}
          >
            Finetune Studio · Built with Rust + React
          </p>
        </div>
      </div>
    </div>
  );
}
