import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Download,
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
    format: "Plain text pairs",
    icon: "¶",
    desc: "Q: ... A: ... separated by blank lines",
  },
];

export default function DatasetPage({ job, setJob, onNext }) {
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [usingSample, setUsingSample] = useState(false);

  const parseFile = useCallback(
    (file) => {
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
          setRows(parsed);
          setFileName(file.name);
          setJob((j) => ({
            ...j,
            dataset: { rows: parsed, fileName: file.name },
          }));
          setUsingSample(false);
        } catch {
          setError("Could not parse file. Check format and try again.");
        }
      };
      reader.readAsText(file);
    },
    [setJob],
  );

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

  const loadSample = () => {
    setRows(SAMPLE_DATA);
    setFileName("sample_dataset.jsonl");
    setJob((j) => ({
      ...j,
      dataset: { rows: SAMPLE_DATA, fileName: "sample_dataset.jsonl" },
    }));
    setUsingSample(true);
    setError(null);
  };

  const clear = () => {
    setRows(null);
    setFileName(null);
    setJob((j) => ({ ...j, dataset: null }));
    setUsingSample(false);
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
      subtitle="Upload your training data. Each example should have an instruction and a response."
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
          {/* Drop zone */}
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
              background: dragOver ? "var(--accent-glow)" : "var(--bg-surface)",
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
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent)",
                  color: "#0a0b0d",
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
              <Btn onClick={loadSample}>Try sample dataset</Btn>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--red)",
                background: "var(--red-dim)",
                border: "1px solid rgba(224,92,92,0.25)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                marginBottom: 20,
              }}
            >
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Format guide */}
          <SectionLabel>Accepted formats</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
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

          <Divider />
          <InfoBox type="info">
            <strong>Tip:</strong> You need at least 50–100 examples for
            meaningful fine-tuning. More examples (500–5000) produce better
            results. Make sure your instructions and responses are high quality
            — garbage in, garbage out.
          </InfoBox>
        </>
      ) : (
        <>
          {/* File info bar */}
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
              <FileText size={16} color="var(--accent)" />
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
                {stats.total} training examples
              </div>
            </div>
            {usingSample && <Tag color="amber">Sample</Tag>}
            <CheckCircle size={18} color="var(--accent)" />
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
              { label: "Total rows", value: stats.total },
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
              Dataset looks good!{" "}
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
