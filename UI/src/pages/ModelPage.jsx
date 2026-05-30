import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Cpu,
  Zap,
  Shield,
  Globe,
  RefreshCw,
  FolderOpen,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  HardDrive,
  Download,
  Lock,
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

// ── Fallback built-in models (shown when API is offline / no local models found)
const BUILTIN_MODELS = [
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
    source: "builtin",
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
    source: "builtin",
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
    source: "builtin",
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
    source: "builtin",
  },
];

// ── API endpoint (reads from env or defaults to same origin)
const API_BASE = import.meta.env.VITE_API_URL || "";

// ── Source tabs
function SourceTabs({ active, onChange }) {
  const tabs = [
    { id: "discover", label: "Available models", icon: Wifi },
    { id: "local", label: "Local / custom path", icon: HardDrive },
    { id: "download", label: "Download & deploy", icon: Download },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        background: "var(--bg-raised)",
        padding: 4,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
      }}
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "9px 14px",
              borderRadius: "var(--radius-md)",
              border: isActive
                ? "1px solid var(--border-accent)"
                : "1px solid transparent",
              background: isActive ? "var(--accent-glow)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              transition: "all 0.15s",
              fontFamily: "var(--font-body)",
              position: "relative",
            }}
          >
            <Icon size={14} />
            {t.label}
            {t.id === "download" && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  padding: "1px 5px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--amber-dim)",
                  color: "var(--amber)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  marginLeft: 4,
                }}
              >
                SOON
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Single model card
function ModelCard({ model, isSelected, onClick }) {
  const Icon = model.icon || HardDrive;
  const isLocal = model.source === "local" || model.source === "custom";
  const isAPI = model.source === "api";

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? "var(--accent-glow)" : "var(--bg-surface)",
        border: `1px solid ${isSelected ? "var(--border-accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "18px",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--radius-md)",
            flexShrink: 0,
            background: isSelected ? "var(--accent-dim)" : "var(--bg-raised)",
            border: `1px solid ${isSelected ? "var(--border-accent)" : "var(--border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            size={17}
            color={isSelected ? "var(--accent)" : "var(--text-muted)"}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
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
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              {model.name}
            </span>
            {model.variant && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {model.variant}
              </span>
            )}
          </div>
          <div
            style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}
          >
            {(model.tags || []).map((t, i) => (
              <Tag key={t} color={model.tagColors?.[i] || "accent"}>
                {t}
              </Tag>
            ))}
            {isAPI && <Tag color="green">On server</Tag>}
            {isLocal && <Tag color="amber">Local path</Tag>}
          </div>
        </div>

        {/* Radio */}
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
                background: "#fff",
              }}
            />
          )}
        </div>
      </div>

      {model.desc && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          {model.desc}
        </p>
      )}

      {/* Path for local models */}
      {model.path && (
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
            background: "var(--bg-raised)",
            padding: "4px 8px",
            borderRadius: "var(--radius-sm)",
            marginBottom: 10,
            wordBreak: "break-all",
          }}
        >
          {model.path}
        </div>
      )}

      {/* Stats row */}
      {(model.params || model.vram || model.context) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {[
            { k: "Params", v: model.params },
            { k: "VRAM", v: model.vram },
            { k: "Context", v: model.context },
          ]
            .filter((s) => s.v)
            .map((s) => (
              <div
                key={s.k}
                style={{
                  background: "var(--bg-base)",
                  borderRadius: "var(--radius-sm)",
                  padding: "5px 8px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 1,
                  }}
                >
                  {s.k}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                  }}
                >
                  {s.v}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Local model form
function LocalModelForm({ onAdd }) {
  const [form, setForm] = useState({
    name: "",
    path: "",
    params: "",
    vram: "",
    context: "",
    notes: "",
  });
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) {
      setError("Model name is required.");
      return;
    }
    if (!form.path.trim()) {
      setError("Model path is required.");
      return;
    }
    setError("");
    onAdd({
      id: `local-${Date.now()}`,
      name: form.name.trim(),
      path: form.path.trim(),
      variant: form.params || "",
      params: form.params || "?",
      vram: form.vram || "?",
      context: form.context || "?",
      desc: form.notes || `Local model at ${form.path.trim()}`,
      tags: ["Local"],
      tagColors: ["amber"],
      icon: HardDrive,
      source: "custom",
    });
    setForm({
      name: "",
      path: "",
      params: "",
      vram: "",
      context: "",
      notes: "",
    });
  };

  const Field = ({ label, placeholder, value, onChange, mono, hint }) => (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: 6,
        }}
      >
        {label}
        {hint && (
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}
          >
            {hint}
          </span>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "9px 12px",
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          fontSize: 13,
          outline: "none",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--border-accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
    </div>
  );

  return (
    <Card style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <FolderOpen size={16} color="var(--accent)" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Add local model
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <Field
          label="Model name *"
          placeholder="e.g. My LLaMA 3 8B"
          value={form.name}
          onChange={(v) => set("name", v)}
        />
        <Field
          label="Params"
          placeholder="e.g. 8B"
          hint="optional"
          value={form.params}
          onChange={(v) => set("params", v)}
        />
      </div>

      <Field
        label="Model path *"
        placeholder="/models/llama3-8b  or  ./models/my-model  or  hf:meta-llama/Llama-3-8B"
        value={form.path}
        onChange={(v) => set("path", v)}
        mono
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <Field
          label="VRAM required"
          placeholder="e.g. 6 GB"
          hint="optional"
          value={form.vram}
          onChange={(v) => set("vram", v)}
        />
        <Field
          label="Context length"
          placeholder="e.g. 8k tokens"
          hint="optional"
          value={form.context}
          onChange={(v) => set("context", v)}
        />
      </div>

      <Field
        label="Notes"
        placeholder="Any notes about this model"
        hint="optional"
        value={form.notes}
        onChange={(v) => set("notes", v)}
      />

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--red)",
            background: "var(--red-dim)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            marginBottom: 14,
            fontSize: 12,
          }}
        >
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="primary" onClick={submit}>
          <Plus size={13} /> Add model
        </Btn>
      </div>
    </Card>
  );
}

// ── Main page
export default function ModelPage({ job, setJob, onNext, onBack }) {
  const [tab, setTab] = useState("discover");
  const [selected, setSelected] = useState(job.model || "mistral-7b");
  const [selectedModel, setSelectedModel] = useState(null);

  // Discover tab state
  const [apiModels, setApiModels] = useState([]);
  const [apiStatus, setApiStatus] = useState("idle"); // idle | loading | ok | error
  const [apiError, setApiError] = useState("");
  const [models, setModels] = useState(BUILTIN_MODELS);

  // Local tab state
  const [customModels, setCustomModels] = useState([]);

  // Fetch models from backend API
  const fetchModels = async () => {
    setApiStatus("loading");
    setApiError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const fetched = (data.models || []).map((m) => ({
        id: m.id || m.name,
        name: m.name,
        variant: m.variant || "",
        params: m.params || m.parameters || "?",
        vram: m.vram_required || m.vram || "?",
        context: m.context_length || m.context || "?",
        path: m.path || "",
        desc: m.description || `Available on server`,
        tags: m.tags || [],
        tagColors: [],
        icon: HardDrive,
        source: "api",
      }));
      setApiModels(fetched);
      // Merge: API models first, then builtins not already covered
      const apiIds = new Set(fetched.map((m) => m.id));
      const merged = [
        ...fetched,
        ...BUILTIN_MODELS.filter((m) => !apiIds.has(m.id)),
      ];
      setModels(merged);
      setApiStatus("ok");
    } catch (err) {
      setApiStatus("error");
      setApiError(
        err.name === "TimeoutError"
          ? "Backend not reachable (timeout). Showing default models."
          : err.message,
      );
      setModels(BUILTIN_MODELS); // fall back to builtins
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchModels();
  }, []);

  const handleSelect = (model) => {
    setSelected(model.id);
    setSelectedModel(model);
  };

  const handleAddCustom = (model) => {
    setCustomModels((prev) => [...prev, model]);
    handleSelect(model);
    // Switch to discover tab to show the selection
  };

  const removeCustom = (id) => {
    setCustomModels((prev) => prev.filter((m) => m.id !== id));
    if (selected === id) {
      setSelected("mistral-7b");
      setSelectedModel(null);
    }
  };

  const handleNext = () => {
    const model =
      selectedModel ||
      models.find((m) => m.id === selected) ||
      customModels.find((m) => m.id === selected);
    setJob((j) => ({ ...j, model: selected, modelMeta: model }));
    onNext();
  };

  // All models visible in discover tab
  const discoverModels = [...models, ...customModels];
  const localOnlyModels = customModels;

  return (
    <PageShell
      title="Select Model"
      subtitle="Choose a model from the server, or add a local model by path."
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
      <SourceTabs active={tab} onChange={setTab} />

      {/* ── Discover tab ─────────────────────────────────────────── */}
      {tab === "discover" && (
        <>
          {/* API status bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              marginBottom: 20,
            }}
          >
            {apiStatus === "loading" && (
              <RefreshCw
                size={13}
                color="var(--text-muted)"
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            {apiStatus === "ok" && <Wifi size={13} color="var(--green)" />}
            {apiStatus === "error" && (
              <WifiOff size={13} color="var(--amber)" />
            )}
            {apiStatus === "idle" && (
              <Wifi size={13} color="var(--text-muted)" />
            )}

            <span
              style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}
            >
              {apiStatus === "loading" &&
                "Checking server for available models…"}
              {apiStatus === "ok" &&
                `${apiModels.length} model${apiModels.length !== 1 ? "s" : ""} found on server · ${BUILTIN_MODELS.length} built-in defaults`}
              {apiStatus === "error" && `Backend offline — ${apiError}`}
              {apiStatus === "idle" && "Connecting to backend…"}
            </span>

            <button
              onClick={fetchModels}
              disabled={apiStatus === "loading"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-muted)",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {/* Model grid */}
          {apiStatus === "ok" && apiModels.length > 0 && (
            <>
              <SectionLabel>On server</SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {apiModels.map((m) => (
                  <ModelCard
                    key={m.id}
                    model={m}
                    isSelected={selected === m.id}
                    onClick={() => handleSelect(m)}
                  />
                ))}
              </div>
              <SectionLabel>
                Default models (download on training start)
              </SectionLabel>
            </>
          )}

          {apiStatus !== "ok" && <SectionLabel>Available models</SectionLabel>}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {BUILTIN_MODELS.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                isSelected={selected === m.id}
                onClick={() => handleSelect(m)}
              />
            ))}
          </div>

          {/* Custom models added via Local tab show here too */}
          {customModels.length > 0 && (
            <>
              <SectionLabel>Your local models</SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {customModels.map((m) => (
                  <div key={m.id} style={{ position: "relative" }}>
                    <ModelCard
                      model={m}
                      isSelected={selected === m.id}
                      onClick={() => handleSelect(m)}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustom(m.id);
                      }}
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--red-dim)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "var(--red)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Local / custom tab ───────────────────────────────────── */}
      {tab === "local" && (
        <>
          <InfoBox type="info" style={{ marginBottom: 20 }}>
            Add a model by filesystem path or HuggingFace repo ID. The backend
            will load it from the given location when training starts.
            <br />
            <br />
            <strong>Path formats:</strong>
            <br />
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              /models/llama3
            </code>{" "}
            — absolute path on server
            <br />
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              ./models/my-model
            </code>{" "}
            — relative to server working directory
            <br />
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
              hf:meta-llama/Llama-3-8B
            </code>{" "}
            — download from HuggingFace Hub
          </InfoBox>

          <LocalModelForm onAdd={handleAddCustom} />

          {localOnlyModels.length > 0 && (
            <>
              <SectionLabel>Added local models</SectionLabel>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {localOnlyModels.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      background: "var(--bg-surface)",
                      border: `1px solid ${selected === m.id ? "var(--border-accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelect(m)}
                  >
                    <HardDrive
                      size={15}
                      color={
                        selected === m.id
                          ? "var(--accent)"
                          : "var(--text-muted)"
                      }
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {m.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {m.path}
                      </div>
                    </div>
                    {selected === m.id && (
                      <CheckCircle size={15} color="var(--accent)" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustom(m.id);
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "var(--red-dim)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "var(--red)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {localOnlyModels.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No local models added yet. Fill in the form above to add one.
            </div>
          )}
        </>
      )}

      {/* ── Download & deploy tab (coming soon) ─────────────────── */}
      {tab === "download" && (
        <div style={{ marginBottom: 24 }}>
          {/* Coming soon banner */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "48px 32px",
              marginBottom: 24,
              background: "var(--bg-surface)",
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius-xl)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-lg)",
                background: "var(--amber-dim)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Lock size={24} color="var(--amber)" />
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Download & Deploy — Coming Soon
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                maxWidth: 480,
                lineHeight: 1.7,
              }}
            >
              Download models directly and configure deployment targets.
              Available once the model management API is complete.
            </div>
          </div>

          {/* Planned features preview */}
          <SectionLabel>Planned deployment methods</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              {
                icon: "🤗",
                title: "HuggingFace Hub",
                desc: "Download any public or gated model directly from HuggingFace. Requires HF_TOKEN for gated models like LLaMA 3 and Gemma.",
                tags: ["Requires HF_TOKEN"],
              },
              {
                icon: "🐳",
                title: "NVIDIA NGC Container",
                desc: "Pull optimised model containers from NVIDIA NGC registry. Best for A100/H100 GPU setups with TensorRT-LLM.",
                tags: ["GPU optimised"],
              },
              {
                icon: "📦",
                title: "Ollama",
                desc: "Pull and serve models via Ollama. Simple one-command setup, runs locally. Compatible with the Candle inference server.",
                tags: ["Local", "Easy setup"],
              },
              {
                icon: "⚡",
                title: "vLLM / TGI",
                desc: "Deploy to a vLLM or Text Generation Inference server. Production-grade serving with batching and continuous streaming.",
                tags: ["Production"],
              },
            ].map((m) => (
              <div
                key={m.title}
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  opacity: 0.65,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {m.title}
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                      {m.tags.map((t) => (
                        <Tag key={t} color="amber">
                          {t}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  <Lock
                    size={13}
                    color="var(--text-muted)"
                    style={{ marginLeft: "auto" }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {m.desc}
                </p>
              </div>
            ))}
          </div>

          <InfoBox type="warning">
            This tab will be enabled once the backend model management API is
            complete (Phase 2). Use <strong>Available models</strong> or{" "}
            <strong>Local / custom path</strong> for now.
          </InfoBox>
        </div>
      )}

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
            desc: "LoRA only trains 0.1%–1% of parameters — fits on consumer GPUs.",
          },
          {
            title: "Fast training",
            desc: "Minutes to hours, not days. A 7B model fine-tunes in under 2 hours on a single GPU.",
          },
          {
            title: "Tiny adapter",
            desc: "Output is a 10–100 MB adapter file that slots onto the base model.",
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

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </PageShell>
  );
}
