import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Shield,
  X,
  Camera,
  Key,
  Globe,
  Palette,
  Bell as BellIcon,
  Lock,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

// ── Slide-in panel ────────────────────────────────────────────────────
function Panel({ open, onClose, title, width = 400, children }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 299,
            transition: "opacity 0.2s",
          }}
        />
      )}
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.25)" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              borderRadius: "var(--radius-full)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <X size={16} />
          </button>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Section heading inside panel ──────────────────────────────────────
function PanelSection({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────
function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", readOnly }) {
  return (
    <input
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      type={type}
      readOnly={readOnly}
      style={{
        width: "100%",
        padding: "9px 12px",
        background: readOnly ? "var(--bg-base)" : "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        color: readOnly ? "var(--text-muted)" : "var(--text-primary)",
        fontSize: 13,
        outline: "none",
        fontFamily: "var(--font-body)",
      }}
      onFocus={(e) => {
        if (!readOnly) e.target.style.borderColor = "var(--border-accent)";
      }}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
    />
  );
}

function SaveBtn({ onClick, saving, saved }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 18px",
        borderRadius: "var(--radius-full)",
        background: saved ? "var(--green)" : "var(--accent)",
        border: "none",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        cursor: saving ? "not-allowed" : "pointer",
        transition: "background 0.2s",
      }}
    >
      {saved ? (
        <>
          <Check size={13} /> Saved
        </>
      ) : saving ? (
        "Saving…"
      ) : (
        "Save changes"
      )}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          cursor: "pointer",
          background: checked ? "var(--accent)" : "var(--bg-active)",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
          }}
        />
      </div>
    </div>
  );
}

// ── Role badge ────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const colors = {
    admin: { bg: "var(--accent-dim)", color: "var(--accent)", label: "Admin" },
    user: {
      bg: "var(--bg-active)",
      color: "var(--text-secondary)",
      label: "Member",
    },
    viewer: {
      bg: "var(--bg-active)",
      color: "var(--text-muted)",
      label: "Viewer",
    },
  };
  const c = colors[role] || colors.user;
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: "var(--radius-full)",
        background: c.bg,
        color: c.color,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {c.label}
    </span>
  );
}

// ── Profile panel ─────────────────────────────────────────────────────
function ProfilePanel({ open, onClose, user }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwdError, setPwdError] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Update failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const savePwd = async () => {
    setPwdError("");
    if (!pwdForm.current) return setPwdError("Current password is required");
    if (pwdForm.next.length < 8) return setPwdError("Min. 8 characters");
    if (pwdForm.next !== pwdForm.confirm)
      return setPwdError("Passwords do not match");
    setSaving(true);
    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          current_password: pwdForm.current,
          new_password: pwdForm.next,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error?.message || "Password change failed");
      setPwdSaved(true);
      setPwdForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwdSaved(false), 2000);
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel open={open} onClose={onClose} title="Profile">
      {/* Avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>
              {user?.name?.slice(0, 2).toUpperCase() || "U"}
            </span>
          </div>
          <button
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Camera size={11} color="var(--text-muted)" />
          </button>
        </div>
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {user?.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            {user?.email}
          </div>
          <RoleBadge role={user?.role} />
        </div>
      </div>

      <PanelSection label="Personal info">
        <FieldRow label="Display name">
          <Input value={name} onChange={setName} placeholder="Your name" />
        </FieldRow>
        <FieldRow label="Email address">
          <Input
            value={email}
            onChange={setEmail}
            placeholder="your@email.com"
            type="email"
          />
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
          >
            Changing email requires re-login
          </div>
        </FieldRow>
        <FieldRow label="Account ID">
          <Input value={user?.id || ""} readOnly />
        </FieldRow>
        <FieldRow label="Member since">
          <Input
            value={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : ""
            }
            readOnly
          />
        </FieldRow>
        <SaveBtn onClick={saveProfile} saving={saving} saved={saved} />
      </PanelSection>

      <PanelSection label="Change password">
        <FieldRow label="Current password">
          <Input
            value={pwdForm.current}
            onChange={(v) => setPwdForm((p) => ({ ...p, current: v }))}
            type="password"
            placeholder="••••••••"
          />
        </FieldRow>
        <FieldRow label="New password">
          <Input
            value={pwdForm.next}
            onChange={(v) => setPwdForm((p) => ({ ...p, next: v }))}
            type="password"
            placeholder="Min. 8 characters"
          />
        </FieldRow>
        <FieldRow label="Confirm new password">
          <Input
            value={pwdForm.confirm}
            onChange={(v) => setPwdForm((p) => ({ ...p, confirm: v }))}
            type="password"
            placeholder="Repeat new password"
          />
        </FieldRow>
        {pwdError && (
          <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>
            {pwdError}
          </div>
        )}
        <SaveBtn onClick={savePwd} saving={saving} saved={pwdSaved} />
      </PanelSection>
    </Panel>
  );
}

// ── Settings panel ────────────────────────────────────────────────────
function SettingsPanel({ open, onClose, theme, onToggleTheme }) {
  const [notifs, setNotifs] = useState({
    jobDone: true,
    jobFailed: true,
    weeklyReport: false,
  });
  const [hfToken, setHfToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ hf_token: hfToken }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Panel open={open} onClose={onClose} title="Settings">
      <PanelSection label="Appearance">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Theme
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {theme === "dark" ? "Dark mode" : "Light mode"}
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
      </PanelSection>

      <PanelSection label="Notifications">
        <Toggle
          label="Job completed"
          checked={notifs.jobDone}
          onChange={(v) => setNotifs((n) => ({ ...n, jobDone: v }))}
        />
        <Toggle
          label="Job failed"
          checked={notifs.jobFailed}
          onChange={(v) => setNotifs((n) => ({ ...n, jobFailed: v }))}
        />
        <Toggle
          label="Weekly report"
          checked={notifs.weeklyReport}
          onChange={(v) => setNotifs((n) => ({ ...n, weeklyReport: v }))}
        />
      </PanelSection>

      <PanelSection label="Integrations">
        <FieldRow label="HuggingFace token">
          <div style={{ position: "relative" }}>
            <input
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              type={showToken ? "text" : "password"}
              placeholder="hf_xxxxxxxxxxxx"
              style={{
                width: "100%",
                padding: "9px 36px 9px 12px",
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
                fontFamily: "var(--font-mono)",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--border-accent)")
              }
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              onClick={() => setShowToken((v) => !v)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
          >
            Required for gated models (LLaMA 3, Gemma)
          </div>
        </FieldRow>
        <SaveBtn onClick={save} saving={false} saved={saved} />
      </PanelSection>
    </Panel>
  );
}

// ── Permissions panel ─────────────────────────────────────────────────
function PermissionsPanel({ open, onClose, user }) {
  const role = user?.role || "user";

  const permissions = [
    {
      group: "Datasets",
      items: [
        { label: "Upload datasets", roles: ["admin", "user"] },
        { label: "View own datasets", roles: ["admin", "user", "viewer"] },
        { label: "Delete datasets", roles: ["admin", "user"] },
        { label: "View all users datasets", roles: ["admin"] },
      ],
    },
    {
      group: "Training jobs",
      items: [
        { label: "Create training jobs", roles: ["admin", "user"] },
        { label: "View own jobs", roles: ["admin", "user", "viewer"] },
        { label: "Cancel own jobs", roles: ["admin", "user"] },
        { label: "View all users jobs", roles: ["admin"] },
        { label: "Cancel any job", roles: ["admin"] },
      ],
    },
    {
      group: "Models & adapters",
      items: [
        { label: "Download adapters", roles: ["admin", "user"] },
        { label: "View adapters", roles: ["admin", "user", "viewer"] },
        { label: "Delete adapters", roles: ["admin"] },
        { label: "Add local models", roles: ["admin"] },
      ],
    },
    {
      group: "Administration",
      items: [
        { label: "Manage users", roles: ["admin"] },
        { label: "View system settings", roles: ["admin"] },
        { label: "Access API keys", roles: ["admin"] },
      ],
    },
  ];

  const has = (roles) => roles.includes(role);

  return (
    <Panel open={open} onClose={onClose} title="Permissions" width={460}>
      {/* Role summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          background: "var(--bg-raised)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        <Shield size={18} color="var(--accent)" />
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Your role: <RoleBadge role={role} />
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}
          >
            {role === "admin" &&
              "Full access to all features and user management"}
            {role === "user" &&
              "Can create datasets, run training jobs and download adapters"}
            {role === "viewer" && "Read-only access to shared resources"}
          </div>
        </div>
      </div>

      {permissions.map((group) => (
        <PanelSection key={group.group} label={group.group}>
          {group.items.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: has(item.roles)
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                }}
              >
                {item.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {has(item.roles) ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--green)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Check size={12} /> Allowed
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    — Restricted
                  </span>
                )}
              </div>
            </div>
          ))}
        </PanelSection>
      ))}

      {role !== "admin" && (
        <div
          style={{
            padding: "12px 14px",
            background: "var(--bg-raised)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          Contact your administrator to request elevated permissions.
        </div>
      )}
    </Panel>
  );
}

// ── Main Header ───────────────────────────────────────────────────────
export default function Header({ theme, onToggleTheme, user, onSignOut }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [panel, setPanel] = useState(null); // 'profile' | 'settings' | 'permissions'
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPanel = (name) => {
    setPanel(name);
    setUserMenuOpen(false);
  };

  return (
    <>
      <header
        style={{
          height: 56,
          flexShrink: 0,
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px 0 16px",
          zIndex: 100,
        }}
      >
        {/* Left: Logo */}
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
              flexShrink: 0,
            }}
          >
            <Sparkles size={15} color="var(--accent)" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
                letterSpacing: "-0.3px",
                lineHeight: 1.1,
              }}
            >
              Finetune Studio
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
              }}
            >
              Powered by LoRA · Rust
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <HeaderIconBtn title="Notifications">
            <Bell size={15} />
          </HeaderIconBtn>

          <button
            onClick={onToggleTheme}
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--bg-raised)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 12,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-strong)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            {theme === "dark" ? (
              <>
                <Sun size={13} />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={13} />
                <span>Dark</span>
              </>
            )}
          </button>

          <div
            style={{
              width: 1,
              height: 22,
              background: "var(--border)",
              margin: "0 4px",
            }}
          />

          {/* User menu trigger */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px 5px 6px",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${userMenuOpen ? "var(--border-accent)" : "var(--border)"}`,
                background: userMenuOpen
                  ? "var(--accent-glow)"
                  : "var(--bg-raised)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {user ? user.name.slice(0, 2).toUpperCase() : "U"}
                </span>
              </div>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  {user?.name || "User"}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    textTransform: "capitalize",
                  }}
                >
                  {user?.role || "member"}
                </div>
              </div>
              <ChevronDown
                size={12}
                color="var(--text-muted)"
                style={{
                  transform: userMenuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                }}
              />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 220,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                  zIndex: 200,
                }}
              >
                {/* User header */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {user?.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 5,
                    }}
                  >
                    {user?.email}
                  </div>
                  <RoleBadge role={user?.role} />
                </div>
                {/* Items */}
                <div style={{ padding: "6px" }}>
                  <DropdownItem
                    icon={User}
                    label="Profile"
                    onClick={() => openPanel("profile")}
                  />
                  <DropdownItem
                    icon={Settings}
                    label="Settings"
                    onClick={() => openPanel("settings")}
                  />
                  <DropdownItem
                    icon={Shield}
                    label="Permissions"
                    onClick={() => openPanel("permissions")}
                  />
                  <div
                    style={{
                      height: 1,
                      background: "var(--border)",
                      margin: "4px 0",
                    }}
                  />
                  <DropdownItem
                    icon={LogOut}
                    label="Sign out"
                    danger
                    onClick={onSignOut}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-in panels */}
      <ProfilePanel
        open={panel === "profile"}
        onClose={() => setPanel(null)}
        user={user}
      />
      <SettingsPanel
        open={panel === "settings"}
        onClose={() => setPanel(null)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <PermissionsPanel
        open={panel === "permissions"}
        onClose={() => setPanel(null)}
        user={user}
      />
    </>
  );
}

function HeaderIconBtn({ children, title }) {
  return (
    <button
      title={title}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--text-muted)",
        cursor: "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-raised)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}

function DropdownItem({ icon: Icon, label, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        border: "none",
        background: "transparent",
        color: danger ? "var(--red)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 13,
        transition: "all 0.12s",
        textAlign: "left",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = danger
          ? "var(--red-dim)"
          : "var(--bg-hover)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
