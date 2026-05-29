import { Database, Cpu, Zap, BarChart2, ChevronRight } from "lucide-react";

const STEPS = [
  { id: "dataset", label: "Dataset", icon: Database, desc: "Upload & format" },
  { id: "model", label: "Select Model", icon: Cpu, desc: "Choose & configure" },
  { id: "train", label: "Fine-tune", icon: Zap, desc: "LoRA training" },
  { id: "eval", label: "Evaluate", icon: BarChart2, desc: "Test & export" },
];

export default function Sidebar({ current, onNav, job }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <aside
      style={{
        width: 230,
        flexShrink: 0,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "background 0.2s",
      }}
    >
      {/* Steps */}
      <nav style={{ flex: 1, padding: "20px 12px 16px" }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            padding: "0 8px",
            marginBottom: 10,
          }}
        >
          Workflow
        </div>
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = step.id === current;
          const isDone = idx < currentIdx;

          return (
            <button
              key={step.id}
              onClick={() => onNav(step.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: "12px",
                border: isActive
                  ? "1px solid var(--border-accent)"
                  : "1px solid transparent",
                background: isActive ? "var(--accent-glow)" : "transparent",
                color: isActive
                  ? "var(--accent)"
                  : isDone
                    ? "var(--text-secondary)"
                    : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s",
                marginBottom: 2,
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "10px",
                  background: isActive
                    ? "var(--accent-dim)"
                    : isDone
                      ? "var(--accent-dim)"
                      : "var(--bg-raised)",
                  border: `1px solid ${isActive ? "var(--border-accent)" : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isDone && !isActive ? (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                ) : (
                  <Icon
                    size={13}
                    color={isActive ? "var(--accent)" : "currentColor"}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.2,
                    color: "inherit",
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 1,
                  }}
                >
                  {step.desc}
                </div>
              </div>
              {isActive && <ChevronRight size={12} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </nav>

      {/* Job config footer */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-raised)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 10,
          }}
        >
          Current config
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Chip label="Model" value={job.model} />
          <Chip label="Rank r" value={job.loraRank} />
          <Chip label="Epochs" value={job.epochs} />
        </div>
      </div>
    </aside>
  );
}

function Chip({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--accent)",
          background: "var(--accent-dim)",
          padding: "1px 8px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--border-accent)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
