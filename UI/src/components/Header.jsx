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
} from "lucide-react";

export default function Header({ theme, onToggleTheme }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
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
      {/* ── Left: Logo + Title ── */}
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
            LLM Fine Tune Studio
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            Powered by LoRA · Candle
          </div>
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Notification bell */}
        <HeaderIconBtn title="Notifications">
          <Bell size={15} />
        </HeaderIconBtn>

        {/* Dark/light toggle */}
        <button
          onClick={onToggleTheme}
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
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

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 22,
            background: "var(--border)",
            margin: "0 4px",
          }}
        />

        {/* User menu */}
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
            {/* Avatar */}
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
                AJ
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
                Alex J.
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                Admin
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
                width: 200,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              {/* User info header */}
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
                  Alex Johnson
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  alex@company.com
                </div>
              </div>

              {/* Menu items */}
              <div style={{ padding: "6px" }}>
                <DropdownItem icon={User} label="Profile" />
                <DropdownItem icon={Settings} label="Settings" />
                <DropdownItem icon={Shield} label="Permissions" />
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "4px 0",
                  }}
                />
                <DropdownItem icon={LogOut} label="Sign out" danger />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
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

function DropdownItem({ icon: Icon, label, danger }) {
  return (
    <button
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
