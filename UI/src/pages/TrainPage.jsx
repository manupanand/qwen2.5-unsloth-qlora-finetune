import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Play,
  Square,
  Download,
  ChevronDown,
  Info,
  Cpu,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  PageShell,
  Card,
  SectionLabel,
  Btn,
  SliderField,
  Tag,
  Divider,
  InfoBox,
  Terminal as TerminalLog,
} from "../components/UI.jsx";

// ─── Method registry ────────────────────────────────────────────────
// Add new methods here; the selector and config panels are auto-driven
const METHODS = {
  lora: {
    id: "lora",
    label: "LoRA",
    fullName: "Low-Rank Adaptation",
    icon: Zap,
    color: "#2563EB",
    badge: "Recommended",
    badgeColor: "accent",
    vram: "~6 GB",
    speed: "Fast",
    desc: "Injects small trainable rank-decomposition matrices into attention layers. Full precision (fp32/bf16). Best all-round choice.",
    presets: [
      {
        id: "quick",
        label: "Quick test",
        icon: "⚡",
        desc: "~10 min",
        config: {
          loraRank: 8,
          loraAlpha: 16,
          learningRate: 0.0003,
          epochs: 1,
          batchSize: 8,
          maxSeqLen: 256,
        },
      },
      {
        id: "balanced",
        label: "Balanced",
        icon: "⚖️",
        desc: "~1 hour",
        config: {
          loraRank: 16,
          loraAlpha: 32,
          learningRate: 0.0002,
          epochs: 3,
          batchSize: 4,
          maxSeqLen: 512,
        },
      },
      {
        id: "quality",
        label: "High quality",
        icon: "✦",
        desc: "~3 hrs",
        config: {
          loraRank: 64,
          loraAlpha: 128,
          learningRate: 0.0001,
          epochs: 5,
          batchSize: 2,
          maxSeqLen: 1024,
        },
      },
    ],
  },
  qlora: {
    id: "qlora",
    label: "QLoRA",
    fullName: "Quantized LoRA",
    icon: Cpu,
    color: "#7c3aed",
    badge: "Low VRAM",
    badgeColor: "purple",
    vram: "~4 GB",
    speed: "Moderate",
    desc: "Quantizes the base model to 4-bit NF4 before loading, then trains LoRA adapters on top. Same adapter quality, much less GPU memory.",
    presets: [
      {
        id: "quick",
        label: "Quick test",
        icon: "⚡",
        desc: "~15 min",
        config: {
          loraRank: 8,
          loraAlpha: 16,
          learningRate: 0.0003,
          epochs: 1,
          batchSize: 4,
          maxSeqLen: 256,
        },
      },
      {
        id: "balanced",
        label: "Balanced",
        icon: "⚖️",
        desc: "~1.5 hr",
        config: {
          loraRank: 16,
          loraAlpha: 32,
          learningRate: 0.0002,
          epochs: 3,
          batchSize: 2,
          maxSeqLen: 512,
        },
      },
      {
        id: "quality",
        label: "High quality",
        icon: "✦",
        desc: "~4 hrs",
        config: {
          loraRank: 64,
          loraAlpha: 128,
          learningRate: 0.0001,
          epochs: 5,
          batchSize: 1,
          maxSeqLen: 1024,
        },
      },
    ],
  },
  // Scaffold for future methods — UI picks these up automatically:
  // peft:  { id: 'peft',  label: 'PEFT',  ... }
  // sft:   { id: 'sft',   label: 'SFT',   ... }
};

// QLoRA-specific quantization options
const QUANT_BITS = ["4-bit", "8-bit"];
const QUANT_TYPES = ["nf4", "fp4"];
const COMPUTE_DTYPES = ["bfloat16", "float16", "float32"];

function generateLossPoint(step, totalSteps) {
  const base = 2.5 * Math.exp(-step / (totalSteps * 0.4));
  const noise = (Math.random() - 0.5) * 0.08;
  return Math.max(0.05, base + noise);
}

// ─── Method Selector ────────────────────────────────────────────────
function MethodSelector({ selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const m = METHODS[selected];

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: "var(--radius-lg)",
          border: `1px solid ${open ? "var(--border-accent)" : "var(--border-strong)"}`,
          background: open ? "var(--accent-glow)" : "var(--bg-surface)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s",
          minWidth: 200,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            background: m.color + "22",
            border: `1px solid ${m.color}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <m.icon size={15} color={m.color} />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              {m.label}
            </span>
            <MethodTag color={m.color}>{m.badge}</MethodTag>
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}
          >
            {m.fullName}
          </div>
        </div>
        <ChevronDown
          size={14}
          color="var(--text-muted)"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 50,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            overflow: "hidden",
            minWidth: 360,
          }}
        >
          {Object.values(METHODS).map((method, idx) => {
            const isSelected = method.id === selected;
            return (
              <button
                key={method.id}
                onClick={() => {
                  onChange(method.id);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  border: "none",
                  borderBottom:
                    idx < Object.keys(METHODS).length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  background: isSelected ? "var(--accent-glow)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-md)",
                    background: method.color + "22",
                    border: `1px solid ${method.color}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <method.icon size={16} color={method.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {method.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {method.fullName}
                    </span>
                    <MethodTag color={method.color}>{method.badge}</MethodTag>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.55,
                    }}
                  >
                    {method.desc}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <StatPill label="VRAM" value={method.vram} />
                    <StatPill label="Speed" value={method.speed} />
                  </div>
                </div>
                {isSelected && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: method.color,
                      flexShrink: 0,
                      marginTop: 8,
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Coming soon placeholder */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-raised)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginRight: 4,
              }}
            >
              Coming soon:
            </span>
            {["PEFT", "SFT", "DPO", "ORPO"].map((name) => (
              <span
                key={name}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  border: "1px dashed var(--border-strong)",
                  color: "var(--text-muted)",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MethodTag({ children, color }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: "var(--radius-full)",
        background: color + "20",
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {children}
    </span>
  );
}

function StatPill({ label, value }) {
  return (
    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}: </span>
      {value}
    </span>
  );
}

// ─── QLoRA-specific config panel ────────────────────────────────────
function QLoRAConfig({ cfg, setCfg }) {
  const toggle = (key, val) => setCfg((c) => ({ ...c, [key]: val }));

  return (
    <Card style={{ marginBottom: 16, borderColor: "#7c3aed44" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Cpu size={14} color="#7c3aed" />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#7c3aed",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Quantization
        </span>
      </div>

      {/* Quant bits */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Bits
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}
          >
            base model precision
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {QUANT_BITS.map((b) => (
            <ToggleChip
              key={b}
              active={cfg.quantBits === b}
              onClick={() => toggle("quantBits", b)}
              activeColor="#7c3aed"
            >
              {b}
            </ToggleChip>
          ))}
        </div>
      </div>

      {/* Quant type — only for 4-bit */}
      {cfg.quantBits === "4-bit" && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Quantization type
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginLeft: 8,
              }}
            >
              nf4 recommended
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {QUANT_TYPES.map((t) => (
              <ToggleChip
                key={t}
                active={cfg.quantType === t}
                onClick={() => toggle("quantType", t)}
                activeColor="#7c3aed"
              >
                {t}
              </ToggleChip>
            ))}
          </div>
        </div>
      )}

      {/* Compute dtype */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Compute dtype
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}
          >
            adapter training precision
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {COMPUTE_DTYPES.map((d) => (
            <ToggleChip
              key={d}
              active={cfg.computeDtype === d}
              onClick={() => toggle("computeDtype", d)}
              activeColor="#7c3aed"
            >
              {d}
            </ToggleChip>
          ))}
        </div>
      </div>

      {/* Double quant toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Double quantization
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            quantize the quantization constants — saves ~0.4 bits/param
          </div>
        </div>
        <Toggle
          active={cfg.doubleQuant}
          onChange={(v) => toggle("doubleQuant", v)}
          color="#7c3aed"
        />
      </div>

      {/* Nested quant toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Nested quantization
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            second-level quant for further memory reduction
          </div>
        </div>
        <Toggle
          active={cfg.nestedQuant}
          onChange={(v) => toggle("nestedQuant", v)}
          color="#7c3aed"
        />
      </div>
    </Card>
  );
}

// ─── LoRA-specific config panel ─────────────────────────────────────
function LoRAConfig({ job, setJob }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Zap size={14} color="var(--accent)" />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          LoRA
        </span>
      </div>
      <SliderField
        label="Rank (r)"
        hint="adapter granularity"
        value={job.loraRank}
        min={4}
        max={128}
        step={4}
        onChange={(v) => setJob((j) => ({ ...j, loraRank: v }))}
      />
      <SliderField
        label="Alpha (α)"
        hint="scaling factor"
        value={job.loraAlpha}
        min={8}
        max={256}
        step={8}
        onChange={(v) => setJob((j) => ({ ...j, loraAlpha: v }))}
      />

      {/* Target modules — toggle chips */}
      <div style={{ marginTop: 4 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Target modules
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}
          >
            which attention layers to adapt
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj"].map(
            (mod) => {
              const active = (
                job.targetModules || ["q_proj", "v_proj"]
              ).includes(mod);
              return (
                <ToggleChip
                  key={mod}
                  active={active}
                  activeColor="var(--accent)"
                  onClick={() => {
                    const current = job.targetModules || ["q_proj", "v_proj"];
                    const next = active
                      ? current.filter((m) => m !== mod)
                      : [...current, mod];
                    setJob((j) => ({ ...j, targetModules: next }));
                  }}
                >
                  {mod}
                </ToggleChip>
              );
            },
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Shared toggle primitives ────────────────────────────────────────
function ToggleChip({
  children,
  active,
  onClick,
  activeColor = "var(--accent)",
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        border: `1px solid ${active ? activeColor + "80" : "var(--border)"}`,
        background: active ? activeColor + "18" : "transparent",
        color: active ? activeColor : "var(--text-muted)",
        cursor: "pointer",
        transition: "all 0.12s",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ active, onChange, color = "var(--accent)" }) {
  return (
    <div
      onClick={() => onChange(!active)}
      style={{
        width: 36,
        height: 20,
        borderRadius: "var(--radius-full)",
        background: active ? color : "var(--bg-raised)",
        border: `1px solid ${active ? color + "80" : "var(--border)"}`,
        position: "relative",
        cursor: "pointer",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: active ? 18 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: active ? "#fff" : "var(--text-muted)",
          transition: "left 0.2s",
        }}
      />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────
export default function TrainPage({ job, setJob, onNext, onBack }) {
  const [method, setMethod] = useState("lora");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [lossData, setLossData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [elapsed, setElapsed] = useState(0);

  // QLoRA-specific state
  const [qloraCfg, setQloraCfg] = useState({
    quantBits: "4-bit",
    quantType: "nf4",
    computeDtype: "bfloat16",
    doubleQuant: true,
    nestedQuant: false,
  });

  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const currentMethod = METHODS[method];
  const totalSteps =
    job.epochs *
    Math.max(10, (job.dataset?.rows?.length || 100) / job.batchSize);
  const currentStep = Math.round(progress * totalSteps);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Reset on method change
  const handleMethodChange = (m) => {
    if (status === "running") return;
    setMethod(m);
    setStatus("idle");
    setProgress(0);
    setLossData([]);
    setLogs([]);
  };

  const applyPreset = (preset) => setJob((j) => ({ ...j, ...preset.config }));

  const startTraining = () => {
    const methodLabel = currentMethod.label;
    setStatus("running");
    setLossData([]);
    setLogs([
      `[00:00] Initializing ${methodLabel} training on ${job.model}...`,
      method === "qlora"
        ? `[00:00] Loading ${qloraCfg.quantBits} ${qloraCfg.quantType} quantized model (compute: ${qloraCfg.computeDtype})...`
        : `[00:00] Injecting LoRA adapters: rank=${job.loraRank}, alpha=${job.loraAlpha}...`,
    ]);
    setProgress(0);
    setElapsed(0);
    startTimeRef.current = Date.now();
    let step = 0;

    intervalRef.current = setInterval(() => {
      step++;
      const p = step / totalSteps;
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setElapsed(elapsed);

      if (p >= 1) {
        clearInterval(intervalRef.current);
        setProgress(1);
        setStatus("done");
        setLogs((prev) => [
          ...prev,
          `[${fmtTime(elapsed)}] ✓ Training complete! Adapter saved.`,
          `[${fmtTime(elapsed)}] ✓ Output: adapter_model.safetensors + adapter_config.json`,
        ]);
        return;
      }

      setProgress(p);
      const loss = generateLossPoint(step, totalSteps);
      setLossData((prev) => [
        ...prev,
        {
          step,
          loss: parseFloat(loss.toFixed(4)),
          progress: Math.round(p * 100),
        },
      ]);

      if (step % 5 === 0 || step === 1) {
        const epoch = Math.ceil(p * job.epochs);
        const extraInfo =
          method === "qlora"
            ? ` · mem ${(4.2 - p * 0.3).toFixed(1)}GB`
            : ` · lr ${(job.learningRate * (1 - p * 0.5)).toFixed(6)}`;
        setLogs((prev) => [
          ...prev,
          `[${fmtTime(elapsed)}] Epoch ${epoch}/${job.epochs} · step ${step}/${Math.round(totalSteps)} · loss ${loss.toFixed(4)}${extraInfo}`,
        ]);
      }
    }, 120);
  };

  const stopTraining = () => {
    clearInterval(intervalRef.current);
    setStatus("stopped");
    setLogs((prev) => [
      ...prev,
      `[${fmtTime(elapsed)}] Training stopped by user.`,
    ]);
  };

  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Derived method color for status dot ──
  const methodColor = currentMethod.color;

  return (
    <PageShell
      title="Fine-tune"
      subtitle="Select a training method, configure parameters, and start training."
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onBack} disabled={status === "running"}>
            <ChevronLeft size={14} /> Back
          </Btn>
          {status === "done" && (
            <Btn variant="primary" onClick={onNext}>
              Evaluate model →
            </Btn>
          )}
        </div>
      }
    >
      {/* ── Method selector row ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            whiteSpace: "nowrap",
          }}
        >
          Training method
        </div>
        <MethodSelector
          selected={method}
          onChange={handleMethodChange}
          disabled={status === "running"}
        />

        {/* Quick stat pills */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <QuickStat label="VRAM" value={currentMethod.vram} />
          <QuickStat label="Speed" value={currentMethod.speed} />
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}
      >
        {/* ── LEFT: Config ─────────────────────────────────────── */}
        <div>
          {/* Presets */}
          <SectionLabel>Presets</SectionLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 20,
            }}
          >
            {currentMethod.presets.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                disabled={status === "running"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: status === "running" ? 0.4 : 1,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = methodColor + "80";
                  e.currentTarget.style.background = methodColor + "0a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bg-surface)";
                }}
              >
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {p.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {p.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Method-specific config */}
          <SectionLabel>Method config</SectionLabel>
          {method === "lora" && <LoRAConfig job={job} setJob={setJob} />}
          {method === "qlora" && (
            <>
              <LoRAConfig job={job} setJob={setJob} />
              <QLoRAConfig cfg={qloraCfg} setCfg={setQloraCfg} />
            </>
          )}

          {/* Shared training params */}
          <SectionLabel>Training parameters</SectionLabel>
          <Card style={{ marginBottom: 20 }}>
            <SliderField
              label="Learning rate"
              value={job.learningRate}
              min={0.00005}
              max={0.001}
              step={0.00005}
              onChange={(v) => setJob((j) => ({ ...j, learningRate: v }))}
              format={(v) => v.toExponential(1)}
            />
            <SliderField
              label="Epochs"
              value={job.epochs}
              min={1}
              max={10}
              onChange={(v) => setJob((j) => ({ ...j, epochs: v }))}
              hint="passes over data"
            />
            <SliderField
              label="Batch size"
              value={job.batchSize}
              min={1}
              max={16}
              onChange={(v) => setJob((j) => ({ ...j, batchSize: v }))}
            />
            <SliderField
              label="Max sequence length"
              value={job.maxSeqLen}
              min={128}
              max={4096}
              step={128}
              onChange={(v) => setJob((j) => ({ ...j, maxSeqLen: v }))}
            />
          </Card>

          {/* Start/stop */}
          {(status === "idle" || status === "stopped") && (
            <Btn
              variant="primary"
              onClick={startTraining}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "11px",
                background: methodColor,
                borderColor: methodColor,
              }}
            >
              <Play size={14} /> Start {currentMethod.label} training
            </Btn>
          )}
          {status === "running" && (
            <Btn
              variant="danger"
              onClick={stopTraining}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "11px",
              }}
            >
              <Square size={14} /> Stop training
            </Btn>
          )}
          {status === "done" && (
            <Btn
              variant="primary"
              onClick={startTraining}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "11px",
                background: methodColor,
                borderColor: methodColor,
              }}
            >
              <Play size={14} /> Re-train
            </Btn>
          )}
        </div>

        {/* ── RIGHT: Live view ─────────────────────────────────── */}
        <div>
          {/* Status bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  status === "running"
                    ? methodColor
                    : status === "done"
                      ? methodColor
                      : status === "stopped"
                        ? "var(--red)"
                        : "var(--text-muted)",
                boxShadow:
                  status === "running" ? `0 0 8px ${methodColor}` : "none",
                animation:
                  status === "running"
                    ? "pulse 1.5s ease-in-out infinite"
                    : "none",
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {status === "idle"
                ? "Ready"
                : status === "running"
                  ? `${currentMethod.label} training…`
                  : status === "done"
                    ? "Complete"
                    : "Stopped"}
            </span>
            {status !== "idle" && (
              <>
                <span style={{ color: "var(--text-muted)" }}>·</span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  {fmtTime(elapsed)}
                </span>
                <span style={{ color: "var(--text-muted)" }}>·</span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                  }}
                >
                  step {currentStep}/{Math.round(totalSteps)}
                </span>
              </>
            )}
            {status !== "idle" && (
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: "var(--bg-raised)",
                  borderRadius: 2,
                  marginLeft: 4,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round(progress * 100)}%`,
                    background:
                      status === "stopped" ? "var(--red)" : methodColor,
                    borderRadius: 2,
                    transition: "width 0.1s",
                  }}
                />
              </div>
            )}
            {status !== "idle" && (
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}
              >
                {Math.round(progress * 100)}%
              </span>
            )}
            {status === "done" && (
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: methodColor,
                  background: methodColor + "18",
                  border: `1px solid ${methodColor}50`,
                  borderRadius: "var(--radius-full)",
                  padding: "4px 12px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Download size={12} /> Download adapter
              </button>
            )}
          </div>

          {/* Loss chart */}
          <Card style={{ marginBottom: 16, padding: "18px 20px 8px" }}>
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
              Training loss
            </div>
            {lossData.length === 0 ? (
              <div
                style={{
                  height: 180,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Start training to see the loss curve
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={lossData}
                  margin={{ top: 4, right: 8, bottom: 4, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="step"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--text-muted)" }}
                    itemStyle={{ color: methodColor }}
                    formatter={(v) => [v.toFixed(4), "loss"]}
                    labelFormatter={(v) => `step ${v}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="loss"
                    stroke={methodColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Terminal log */}
          <TerminalLog logs={logs} height={200} />
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </PageShell>
  );
}

function QuickStat({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
