import { useState } from "react";

export function PageShell({ title, subtitle, children, actions }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 40px 80px" }}>
      <div
        style={{
          marginBottom: 32,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                marginTop: 6,
                color: "var(--text-secondary)",
                fontSize: 14,
                maxWidth: 560,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, style }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        transition: "background 0.2s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

/* ── Btn — all variants use border-radius: var(--radius-full) ── */
export function Btn({ children, onClick, variant = "ghost", disabled, style }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 18px",
    borderRadius: "var(--radius-full)", // always pill-shaped
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s",
    fontFamily: "var(--font-body)",
    whiteSpace: "nowrap",
  };

  const variants = {
    primary: {
      background: "var(--accent)",
      color: "#ffffff",
      border: "1px solid var(--accent)",
      fontWeight: 600,
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid var(--border)",
    },
    danger: {
      background: "var(--red-dim)",
      color: "var(--red)",
      border: "1px solid rgba(239,68,68,0.25)",
    },
    success: {
      background: "var(--green-dim)",
      color: "var(--green)",
      border: "1px solid rgba(34,197,94,0.25)",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => {
        if (!disabled && variant === "primary")
          e.currentTarget.style.background = "var(--accent-hover)";
        if (!disabled && variant === "ghost")
          e.currentTarget.style.background = "var(--bg-raised)";
      }}
      onMouseLeave={(e) => {
        if (!disabled && variant === "primary")
          e.currentTarget.style.background = "var(--accent)";
        if (!disabled && variant === "ghost")
          e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

/* ── Slider ── */
export function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : value;

  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 13,
              color: "var(--text-primary)",
              fontWeight: 500,
            }}
          >
            {label}
          </span>
          {hint && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginLeft: 8,
              }}
            >
              {hint}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--accent)",
            background: "var(--accent-dim)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border-accent)",
          }}
        >
          {display}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 4,
          background: "var(--bg-raised)",
          borderRadius: 2,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent)",
            borderRadius: 2,
            transition: "width 0.1s",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) =>
            onChange(
              step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value),
            )
          }
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {format ? format(min) : min}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {format ? format(max) : max}
        </span>
      </div>
    </div>
  );
}

/* ── Tag ── */
export function Tag({ children, color = "accent" }) {
  const colors = {
    accent: {
      bg: "var(--accent-dim)",
      text: "var(--accent)",
      border: "var(--border-accent)",
    },
    amber: {
      bg: "var(--amber-dim)",
      text: "var(--amber)",
      border: "rgba(245,158,11,0.3)",
    },
    red: {
      bg: "var(--red-dim)",
      text: "var(--red)",
      border: "rgba(239,68,68,0.3)",
    },
    blue: {
      bg: "var(--blue-dim)",
      text: "var(--blue)",
      border: "rgba(96,165,250,0.3)",
    },
    green: {
      bg: "var(--green-dim)",
      text: "var(--green)",
      border: "rgba(34,197,94,0.3)",
    },
  };
  const c = colors[color] || colors.accent;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 9px",
        borderRadius: "var(--radius-full)",
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {children}
    </span>
  );
}

export function Divider() {
  return (
    <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />
  );
}

export function InfoBox({ children, type = "info" }) {
  const colors = {
    info: {
      bg: "var(--blue-dim)",
      border: "rgba(96,165,250,0.3)",
      color: "var(--blue)",
    },
    warning: {
      bg: "var(--amber-dim)",
      border: "rgba(245,158,11,0.3)",
      color: "var(--amber)",
    },
    success: {
      bg: "var(--green-dim)",
      border: "rgba(34,197,94,0.3)",
      color: "var(--green)",
    },
    error: {
      bg: "var(--red-dim)",
      border: "rgba(239,68,68,0.3)",
      color: "var(--red)",
    },
  };
  const c = colors[type] || colors.info;
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

/* ── Terminal log console (black bg, white text) ── */
export function Terminal({ logs = [], height = 180, ref: forwardedRef }) {
  return (
    <div
      style={{
        background: "var(--terminal-bg)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          background: "#0a0a0a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* traffic lights */}
        <div style={{ display: "flex", gap: 5 }}>
          {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
            <div
              key={c}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: c,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "rgba(255,255,255,0.3)",
            marginLeft: 8,
            letterSpacing: "0.04em",
          }}
        >
          training.log
        </span>
      </div>
      {/* Log body */}
      <div
        ref={forwardedRef}
        style={{
          height,
          overflowY: "auto",
          padding: "12px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          lineHeight: 1.9,
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: "var(--terminal-dim)" }}>
            <span style={{ color: "var(--terminal-accent)" }}>$</span> waiting
            for training to start…
          </span>
        ) : (
          logs.map((line, i) => <LogLine key={i} line={line} />)
        )}
      </div>
    </div>
  );
}

function LogLine({ line }) {
  // color rules
  let color = "var(--terminal-text)";
  if (
    line.includes("✓") ||
    line.includes("complete") ||
    line.includes("Complete")
  )
    color = "var(--terminal-accent)";
  else if (line.includes("Initializ") || line.includes("..."))
    color = "#60a5fa";
  else if (line.includes("loss")) color = "#e2e8f0";
  else if (line.includes("stopped") || line.includes("error"))
    color = "#f87171";
  else color = "rgba(226,232,240,0.65)";

  // timestamp prefix highlight
  const match = line.match(/^(\[\d{2}:\d{2}\])\s*(.*)/);
  if (match) {
    return (
      <div>
        <span style={{ color: "rgba(255,255,255,0.25)" }}>{match[1]} </span>
        <span style={{ color }}>{match[2]}</span>
      </div>
    );
  }
  return <div style={{ color }}>{line}</div>;
}
