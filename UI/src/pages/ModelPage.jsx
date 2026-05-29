import { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Cpu,
  Zap,
  Shield,
  Globe,
} from "lucide-react";
import {
  PageShell,
  Card,
  SectionLabel,
  Btn,
  Tag,
  Divider,
  InfoBox,
} from "../components/UI.jsx";

const MODELS = [
  {
    id: "mistral-7b",
    name: "Mistral 7B",
    variant: "v0.3",
    params: "7B",
    vram: "6 GB",
    icon: Zap,
    tags: ["Fast", "Recommended"],
    tagColors: ["accent", "amber"],
    desc: "Best balance of speed and quality. Great for instruction following, chat, and summarization tasks.",
    context: "32k tokens",
    license: "Apache 2.0",
  },
  {
    id: "llama3-8b",
    name: "LLaMA 3",
    variant: "8B Instruct",
    params: "8B",
    vram: "6 GB",
    icon: Globe,
    tags: ["Meta"],
    tagColors: ["blue"],
    desc: "Meta's latest flagship small model. Excellent reasoning and instruction following out of the box.",
    context: "8k tokens",
    license: "LLaMA 3 Community",
  },
  {
    id: "phi3-mini",
    name: "Phi-3 Mini",
    variant: "3.8B",
    params: "3.8B",
    vram: "3 GB",
    icon: Cpu,
    tags: ["Lightweight"],
    tagColors: ["accent"],
    desc: "Microsoft's tiny powerhouse. Runs on modest hardware. Great for simple tasks and fast iteration.",
    context: "4k tokens",
    license: "MIT",
  },
  {
    id: "gemma2-9b",
    name: "Gemma 2",
    variant: "9B IT",
    params: "9B",
    vram: "8 GB",
    icon: Shield,
    tags: ["Google", "Safe"],
    tagColors: ["blue", "accent"],
    desc: "Google's safety-focused model. Strong on reasoning and multilingual tasks. Requires more VRAM.",
    context: "8k tokens",
    license: "Gemma License",
  },
];

export default function ModelPage({ job, setJob, onNext, onBack }) {
  const [selected, setSelected] = useState(job.model);

  const handleNext = () => {
    setJob((j) => ({ ...j, model: selected }));
    onNext();
  };

  return (
    <PageShell
      title="Select  Model"
      subtitle="Choose the foundation model to fine-tune. Smaller models train faster and use less memory."
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onBack}>
            <ChevronLeft size={14} /> Back
          </Btn>
          <Btn variant="primary" onClick={handleNext}>
            Next: Configure Training <ChevronRight size={14} />
          </Btn>
        </div>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {MODELS.map((m) => {
          const Icon = m.icon;
          const isSelected = selected === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelected(m.id)}
              style={{
                background: isSelected
                  ? "var(--accent-glow)"
                  : "var(--bg-surface)",
                border: `1px solid ${isSelected ? "var(--border-accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  e.currentTarget.style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    background: isSelected
                      ? "var(--accent-dim)"
                      : "var(--bg-raised)",
                    border: `1px solid ${isSelected ? "var(--border-accent)" : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    size={18}
                    color={isSelected ? "var(--accent)" : "var(--text-muted)"}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "var(--font-display)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.name}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {m.variant}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    {m.tags.map((t, i) => (
                      <Tag key={t} color={m.tagColors[i] || "accent"}>
                        {t}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `2px solid ${isSelected ? "var(--accent)" : "var(--border-strong)"}`,
                    background: isSelected ? "var(--accent)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#0a0b0d",
                      }}
                    />
                  )}
                </div>
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}
              >
                {m.desc}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  { k: "Params", v: m.params },
                  { k: "VRAM", v: m.vram },
                  { k: "Context", v: m.context },
                ].map((s) => (
                  <div
                    key={s.k}
                    style={{
                      background: "var(--bg-base)",
                      borderRadius: "var(--radius-sm)",
                      padding: "6px 10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      {s.k}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Divider />

      <SectionLabel>What is LoRA?</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {[
          {
            title: "Low memory",
            desc: "LoRA only trains a tiny fraction of parameters — 0.1% to 1% — so it fits on consumer GPUs.",
          },
          {
            title: "Fast training",
            desc: "Training takes minutes to hours, not days. A 7B model can be fine-tuned in under 2 hours on a single GPU.",
          },
          {
            title: "Tiny adapter",
            desc: "The result is a small adapter file (10–100 MB) that slots onto the base model, not a full 14GB copy.",
          },
        ].map((c) => (
          <Card key={c.title} style={{ padding: "16px" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: 6,
              }}
            >
              {c.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {c.desc}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
