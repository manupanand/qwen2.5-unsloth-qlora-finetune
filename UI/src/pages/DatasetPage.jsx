import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Database,
  Search,
} from "lucide-react";
import {
  PageShell,
  Card,
  SectionLabel,
  Btn,
  Tag,
  InfoBox,
  Divider,
} from "../components/UI.jsx";

const SAMPLE_DATA = [
  {
    instruction: "Explain photosynthesis simply",
    output:
      "Photosynthesis is how plants make food from sunlight. Leaves absorb light and use it to turn water and carbon dioxide into glucose (sugar) and oxygen. It's like the plant's way of cooking its own meals using solar energy.",
  },
  {
    instruction: "Write a haiku about coding",
    output:
      "Cursor blinks at night\nLogic flows through empty loops\nBug found, coffee cold",
  },
  {
    instruction: "What is gradient descent?",
    output:
      "Gradient descent is an optimization algorithm that helps machine learning models learn. It works by repeatedly adjusting the model's parameters in the direction that reduces the error, like rolling a ball downhill to find the lowest point.",
  },
  {
    instruction: "Translate to formal English: gonna grab lunch",
    output: "I am going to have lunch.",
  },
  {
    instruction: "Summarize the water cycle",
    output:
      "Water evaporates from oceans and lakes, rises as water vapor, condenses into clouds, and falls back as precipitation (rain/snow). This water then flows back to oceans via rivers, restarting the cycle.",
  },
];

const FORMAT_TIPS = [
  {
    format: "JSONL (recommended)",
    icon: "{}",
    desc: 'Each line: {"instruction": "...", "output": "..."}',
  },
  {
    format: "CSV",
    icon: "≡",
    desc: "Columns: instruction, output (with header row)",
  },
  {
    format: "HuggingFace dataset",
    icon: "🤗",
    desc: "Enter dataset ID e.g. unsloth/Radiology_mini",
  },
];

// Popular HF datasets for quick-pick
const HF_POPULAR = [
  "unsloth/Radiology_mini",
  "unsloth/alpaca",
  "databricks/databricks-dolly-15k",
  "tatsu-lab/alpaca",
  "Open-Orca/OpenOrca",
];

// ── Source tab selector ─────────────────────────────────────────────
function SourceTabs({ active, onChange }) {
  const tabs = [
    { id: "file", label: "Upload file", icon: Upload },
    { id: "hf", label: "HuggingFace dataset", icon: Database },
    { id: "sample", label: "Sample data", icon: CheckCircle },
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
            }}
          >
            <Icon size={14} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function DatasetPage({ job, setJob, onNext }) {
  const [source, setSource] = useState("file"); // 'file' | 'hf' | 'sample'
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [sourceType, setSourceType] = useState(null); // 'file' | 'hf' | 'sample'

  // HF state
  const [hfInput, setHfInput] = useState("");
  const [hfSplit, setHfSplit] = useState("train");
  const [hfLoading, setHfLoading] = useState(false);

  // ── File parsing ────────────────────────────────────────────────
  const parseFile = useCallback((file) => {
    setError(null);
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        let parsed = [];
        if (ext === "jsonl" || ext === "json") {
          parsed = text
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l));
        } else if (ext === "csv") {
          const lines = text.trim().split("\n");
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/"/g, ""));
          parsed = lines.slice(1).map((line) => {
            const vals = line.split(",");
            return Object.fromEntries(
              headers.map((h, i) => [
                h,
                (vals[i] || "").trim().replace(/"/g, ""),
              ]),
            );
          });
        } else {
          setError("Unsupported format. Please use JSONL or CSV.");
          return;
        }
        if (parsed.length === 0) {
          setError("File is empty.");
          return;
        }
        commitDataset(parsed, file.name, "file");
      } catch {
        setError("Could not parse file. Check format and try again.");
      }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const onFileInput = (e) => {
    if (e.target.files[0]) parseFile(e.target.files[0]);
  };

  // ── HuggingFace load ────────────────────────────────────────────
  const loadHFDataset = async (datasetId) => {
    const id = (datasetId || hfInput).trim();
    if (!id) {
      setError("Please enter a HuggingFace dataset ID.");
      return;
    }

    // Validate format: should be "owner/dataset" or "dataset"
    if (id.includes(" ")) {
      setError("Dataset ID cannot contain spaces.");
      return;
    }

    setHfLoading(true);
    setError(null);

    try {
      // HuggingFace datasets-server API — free, no token needed for public datasets
      const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(id)}&config=default&split=${hfSplit}&offset=0&length=100`;
      const res = await fetch(url);

      if (!res.ok) {
        // Try without config=default (some datasets use different config names)
        const url2 = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(id)}&split=${hfSplit}&offset=0&length=100`;
        const res2 = await fetch(url2);
        if (!res2.ok) {
          const err = await res2.json().catch(() => ({}));
          throw new Error(
            err.error || `Dataset "${id}" not found or not public.`,
          );
        }
        const data2 = await res2.json();
        processHFResponse(data2, id);
        return;
      }

      const data = await res.json();
      processHFResponse(data, id);
    } catch (err) {
      setError(
        err.message || "Failed to load dataset. Check the ID and try again.",
      );
    } finally {
      setHfLoading(false);
    }
  };

  const processHFResponse = (data, id) => {
    if (!data.rows || data.rows.length === 0) {
      setError("Dataset loaded but has no rows.");
      return;
    }

    // Normalize: HF returns {row: {field: value}} — extract the row object
    const rawRows = data.rows.map((r) => r.row);

    // Try to find instruction/output columns — map common field names
    const sample = rawRows[0];
    const keys = Object.keys(sample);

    // Common column mappings across popular datasets
    const instructionKey =
      keys.find((k) =>
        [
          "instruction",
          "input",
          "question",
          "prompt",
          "text",
          "conversations",
        ].includes(k.toLowerCase()),
      ) || keys[0];
    const outputKey =
      keys.find((k) =>
        ["output", "response", "answer", "completion", "assistant"].includes(
          k.toLowerCase(),
        ),
      ) || keys[1];

    const normalized = rawRows.map((row) => ({
      instruction: String(row[instructionKey] || ""),
      output: String(row[outputKey] || ""),
      _raw: row, // keep original for reference
    }));

    const displayName = `${id} (${hfSplit})`;
    commitDataset(normalized, displayName, "hf", {
      datasetId: id,
      split: hfSplit,
      totalRows: data.num_rows_total || normalized.length,
      instructionKey,
      outputKey,
    });
  };

  // ── Sample data ──────────────────────────────────────────────────
  const loadSample = () => {
    commitDataset(SAMPLE_DATA, "sample_dataset.jsonl", "sample");
  };

  // ── Commit dataset to state ──────────────────────────────────────
  const commitDataset = (parsed, name, type, meta = {}) => {
    setRows(parsed);
    setFileName(name);
    setSourceType(type);
    setError(null);
    setJob((j) => ({
      ...j,
      dataset: { rows: parsed, fileName: name, sourceType: type, ...meta },
    }));
  };

  const clear = () => {
    setRows(null);
    setFileName(null);
    setSourceType(null);
    setJob((j) => ({ ...j, dataset: null }));
    setHfInput("");
  };

  const stats = rows
    ? {
        total: rows.length,
        avgLen: Math.round(
          rows.reduce(
            (a, r) =>
              a + ((r.instruction || r.input || "") + (r.output || "")).length,
            0,
          ) / rows.length,
        ),
        hasInstruction: rows.filter((r) => r.instruction || r.input).length,
        hasOutput: rows.filter((r) => r.output).length,
      }
    : null;

  return (
    <PageShell
      title="Dataset"
      subtitle="Upload a file, load from HuggingFace, or try sample data."
      actions={
        rows && (
          <Btn variant="primary" onClick={onNext}>
            Next: Choose Model <ChevronRight size={14} />
          </Btn>
        )
      }
    >
      {!rows ? (
        <>
          <SourceTabs
            active={source}
            onChange={(tab) => {
              setSource(tab);
              setError(null);
            }}
          />

          {/* ── File upload tab ── */}
          {source === "file" && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
                  borderRadius: "var(--radius-xl)",
                  padding: "60px 40px",
                  textAlign: "center",
                  background: dragOver
                    ? "var(--accent-glow)"
                    : "var(--bg-surface)",
                  transition: "all 0.2s",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Upload size={24} color="var(--text-muted)" />
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                  }}
                >
                  Drop your dataset here
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    marginBottom: 20,
                    fontSize: 13,
                  }}
                >
                  JSONL or CSV · instruction/output pairs
                </div>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--accent)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <Upload size={14} /> Browse file
                  <input
                    type="file"
                    accept=".jsonl,.json,.csv"
                    onChange={onFileInput}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <SectionLabel>Accepted formats</SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {FORMAT_TIPS.map((f) => (
                  <Card key={f.format} style={{ padding: "16px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 18,
                        color: "var(--accent)",
                        marginBottom: 8,
                      }}
                    >
                      {f.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: 4,
                      }}
                    >
                      {f.format}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      {f.desc}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* ── HuggingFace tab ── */}
          {source === "hf" && (
            <>
              <Card style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 20 }}>🤗</span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      HuggingFace Dataset
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Public datasets only · Free API · No token needed
                    </div>
                  </div>
                </div>

                {/* Dataset ID input */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: 8,
                    }}
                  >
                    Dataset ID
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginLeft: 8,
                      }}
                    >
                      format: owner/dataset-name
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <Search
                        size={13}
                        color="var(--text-muted)"
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        value={hfInput}
                        onChange={(e) => setHfInput(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && !hfLoading && loadHFDataset()
                        }
                        placeholder="e.g. unsloth/Radiology_mini"
                        style={{
                          width: "100%",
                          padding: "9px 12px 9px 34px",
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
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--border)")
                        }
                      />
                    </div>
                    {/* Split selector */}
                    <select
                      value={hfSplit}
                      onChange={(e) => setHfSplit(e.target.value)}
                      style={{
                        padding: "9px 12px",
                        background: "var(--bg-raised)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <option value="train">train</option>
                      <option value="test">test</option>
                      <option value="validation">validation</option>
                    </select>
                    <Btn
                      variant="primary"
                      onClick={() => loadHFDataset()}
                      disabled={!hfInput.trim() || hfLoading}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {hfLoading ? "Loading…" : "Load dataset"}
                    </Btn>
                  </div>
                </div>

                {/* Quick picks */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 8,
                    }}
                  >
                    Popular datasets
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {HF_POPULAR.map((id) => (
                      <button
                        key={id}
                        onClick={() => {
                          setHfInput(id);
                          loadHFDataset(id);
                        }}
                        disabled={hfLoading}
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-full)",
                          border: "1px solid var(--border)",
                          background:
                            hfInput === id
                              ? "var(--accent-dim)"
                              : "transparent",
                          color:
                            hfInput === id
                              ? "var(--accent)"
                              : "var(--text-muted)",
                          cursor: hfLoading ? "not-allowed" : "pointer",
                          transition: "all 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          if (!hfLoading)
                            e.target.style.borderColor = "var(--border-accent)";
                        }}
                        onMouseLeave={(e) => {
                          if (hfInput !== id)
                            e.target.style.borderColor = "var(--border)";
                        }}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              <InfoBox type="info">
                Loads the first 100 rows via the HuggingFace datasets-server
                API. The backend will stream the full dataset when training
                starts. Columns are auto-mapped to{" "}
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  instruction
                </code>{" "}
                /{" "}
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  output
                </code>
                .
              </InfoBox>
            </>
          )}

          {/* ── Sample data tab ── */}
          {source === "sample" && (
            <Card style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent-dim)",
                    border: "1px solid var(--border-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={20} color="var(--accent)" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    Sample dataset
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    5 example instruction/output pairs to try the workflow
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {SAMPLE_DATA.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      background: "var(--bg-raised)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}
                    >
                      Instruction
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-primary)",
                        marginBottom: 6,
                      }}
                    >
                      {row.instruction}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}
                    >
                      Output
                    </div>
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      {row.output.slice(0, 80)}
                      {row.output.length > 80 ? "…" : ""}
                    </div>
                  </div>
                ))}
              </div>
              <Btn
                variant="primary"
                onClick={loadSample}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "11px",
                }}
              >
                Use this sample dataset
              </Btn>
            </Card>
          )}

          {/* Error */}
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
                padding: "10px 14px",
                marginTop: 16,
              }}
            >
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {source === "file" && (
            <>
              <Divider />
              <InfoBox type="info">
                <strong>Tip:</strong> You need at least 50–100 examples for
                meaningful fine-tuning. More examples (500–5000) produce better
                results.
              </InfoBox>
            </>
          )}
        </>
      ) : (
        <>
          {/* Loaded dataset view */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-accent)",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "var(--accent-dim)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sourceType === "hf" ? (
                <span style={{ fontSize: 18 }}>🤗</span>
              ) : (
                <FileText size={16} color="var(--accent)" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {fileName}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {stats.total} rows loaded
                {sourceType === "hf" &&
                  job.dataset?.totalRows > stats.total &&
                  ` (preview — ${job.dataset.totalRows.toLocaleString()} total in dataset)`}
              </div>
            </div>
            {sourceType === "sample" && <Tag color="amber">Sample</Tag>}
            {sourceType === "hf" && <Tag color="blue">HuggingFace</Tag>}
            {sourceType === "file" && <Tag color="accent">Local file</Tag>}
            <CheckCircle size={18} color="var(--accent)" />
            {sourceType === "hf" && (
              <a
                href={`https://huggingface.co/datasets/${job.dataset?.datasetId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={12} /> View on HF
              </a>
            )}
            <Btn
              variant="ghost"
              onClick={clear}
              style={{ padding: "6px 10px" }}
            >
              <Trash2 size={13} />
            </Btn>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              { label: "Loaded rows", value: stats.total },
              { label: "Avg length", value: `${stats.avgLen} chars` },
              { label: "With instruction", value: stats.hasInstruction },
              { label: "With output", value: stats.hasOutput },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--bg-raised)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Column mapping info for HF datasets */}
          {sourceType === "hf" && job.dataset?.instructionKey && (
            <div style={{ marginBottom: 16 }}>
              <InfoBox type="info">
                Auto-mapped:{" "}
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {job.dataset.instructionKey}
                </code>{" "}
                → instruction &nbsp;·&nbsp;
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {job.dataset.outputKey}
                </code>{" "}
                → output. Check the preview below to confirm the mapping looks
                correct.
              </InfoBox>
            </div>
          )}

          {/* Preview table */}
          <SectionLabel>Preview (first 5 rows)</SectionLabel>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["#", "Instruction", "Output"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom:
                          i < 4 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {i + 1}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-secondary)",
                          maxWidth: 220,
                          wordBreak: "break-word",
                        }}
                      >
                        {(row.instruction || row.input || "").slice(0, 80)}
                        {(row.instruction || row.input || "").length > 80
                          ? "…"
                          : ""}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-secondary)",
                          maxWidth: 280,
                          wordBreak: "break-word",
                        }}
                      >
                        {(row.output || "").slice(0, 100)}
                        {(row.output || "").length > 100 ? "…" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div style={{ marginTop: 24 }}>
            <InfoBox type="success">
              Dataset ready!{" "}
              {stats.hasInstruction === stats.total
                ? "All rows have instructions and outputs."
                : `${stats.hasOutput} of ${stats.total} rows have outputs.`}{" "}
              You're ready to pick a base model.
            </InfoBox>
          </div>
        </>
      )}
    </PageShell>
  );
}
