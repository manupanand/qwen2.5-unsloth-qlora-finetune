import { useState, useCallback, useEffect, useRef } from "react";
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
  RefreshCw,
  Edit2,
  X,
  Pause,
  Play,
  HardDrive,
  Clock,
  BarChart2,
  FolderOpen,
  Plus,
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

// ── Constants ─────────────────────────────────────────────────────────
const SAMPLE_DATA = [
  {
    instruction: "Explain photosynthesis simply",
    output: "Photosynthesis is how plants make food from sunlight.",
  },
  {
    instruction: "Write a haiku about coding",
    output:
      "Cursor blinks at night\nLogic flows through empty loops\nBug found, coffee cold",
  },
  {
    instruction: "What is gradient descent?",
    output:
      "Gradient descent is an optimization algorithm that helps ML models learn by minimizing error.",
  },
  {
    instruction: "Translate to formal English: gonna grab lunch",
    output: "I am going to have lunch.",
  },
  {
    instruction: "Summarize the water cycle",
    output:
      "Water evaporates, rises as vapor, condenses into clouds, and falls as precipitation.",
  },
];

const HF_POPULAR = [
  "unsloth/Radiology_mini",
  "unsloth/alpaca",
  "databricks/databricks-dolly-15k",
  "tatsu-lab/alpaca",
  "Open-Orca/OpenOrca",
];

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

// ── Helpers ───────────────────────────────────────────────────────────
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

const apiCall = async (method, path, body) => {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  return data;
};

const fmt = {
  bytes: (b) => {
    if (!b) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  },
  date: (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—",
  status: (s) =>
    ({
      uploaded: { label: "Uploaded", color: "amber" },
      ready: { label: "Ready", color: "accent" },
      validating: { label: "Validating", color: "blue" },
      error: { label: "Error", color: "red" },
      deleted: { label: "Deleted", color: "red" },
    })[s] || { label: s, color: "amber" },
};

// ── Tab selector ──────────────────────────────────────────────────────
function Tabs({ active, onChange, tabs }) {
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
              padding: "9px 12px",
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
            {Icon && <Icon size={14} />} {t.label}
            {t.badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--accent)",
                  color: "#fff",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Upload progress bar ───────────────────────────────────────────────
function ProgressBar({ pct, color = "var(--accent)" }) {
  return (
    <div
      style={{
        height: 6,
        background: "var(--bg-active)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 3,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

// ── Dataset card in My Datasets ───────────────────────────────────────
function DatasetCard({ ds, onDelete, onEdit, onSelect, selected }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(ds.name);
  const [editDesc, setEditDesc] = useState(ds.description || "");
  const status = fmt.status(ds.status);

  const saveEdit = async () => {
    try {
      await apiCall("PATCH", `/api/v1/datasets/${ds.id}`, {
        name: editName,
        description: editDesc,
      });
      onEdit(ds.id, editName, editDesc);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Card
      style={{
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        border: `1px solid ${selected ? "var(--border-accent)" : "var(--border)"}`,
        background: selected ? "var(--accent-glow)" : "var(--bg-surface)",
        transition: "all 0.15s",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
        onClick={() => !editing && !confirmDelete && onSelect(ds)}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: selected ? "var(--accent-dim)" : "var(--bg-raised)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FileText
            size={16}
            color={selected ? "var(--accent)" : "var(--text-muted)"}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "4px 8px",
                background: "var(--bg-raised)",
                border: "1px solid var(--border-accent)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
              }}
            />
          ) : (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ds.name}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <Tag color={status.color}>{status.label}</Tag>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {ds.format?.toUpperCase()}
            </span>
          </div>
        </div>
        {selected && (
          <CheckCircle
            size={16}
            color="var(--accent)"
            style={{ flexShrink: 0 }}
          />
        )}
      </div>

      {/* Edit description */}
      {editing && (
        <div style={{ padding: "0 16px 12px" }}>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 12,
              resize: "vertical",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {[
          {
            icon: BarChart2,
            label: ds.row_count
              ? `${ds.row_count.toLocaleString()} rows`
              : "— rows",
          },
          { icon: HardDrive, label: fmt.bytes(ds.file_size_bytes) },
          { icon: Clock, label: fmt.date(ds.created_at) },
        ].map((s, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <s.icon size={11} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 6,
          justifyContent: "flex-end",
        }}
      >
        {confirmDelete ? (
          <>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                alignSelf: "center",
                marginRight: 4,
              }}
            >
              Delete?
            </span>
            <Btn
              variant="danger"
              onClick={async (e) => {
                e.stopPropagation();
                await onDelete(ds.id);
                setConfirmDelete(false);
              }}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              Yes, delete
            </Btn>
            <Btn
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              Cancel
            </Btn>
          </>
        ) : editing ? (
          <>
            <Btn
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                saveEdit();
              }}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              Save
            </Btn>
            <Btn
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
              }}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              Cancel
            </Btn>
          </>
        ) : (
          <>
            <Btn
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              <Edit2 size={11} />
            </Btn>
            <Btn
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              <Trash2 size={11} />
            </Btn>
            <Btn
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(ds);
              }}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              {selected ? "Selected ✓" : "Use this"}
            </Btn>
          </>
        )}
      </div>
    </Card>
  );
}

// ── Upload tab ────────────────────────────────────────────────────────
function UploadTab({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState(""); // idle | uploading | done | error
  const [error, setError] = useState("");
  const xhrRef = useRef(null);
  const pausedRef = useRef(false);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setDatasetName(f.name.replace(/\.[^/.]+$/, ""));
    setStatus("idle");
    setError("");
    setProgress(0);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  }, []);

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setStatus("uploading");
    setError("");
    setProgress(0);
    pausedRef.current = false;

    try {
      const format = file.name.split(".").pop().toLowerCase();
      const name = datasetName.trim() || file.name;

      // ── Step 1: Get presigned URL ─────────────────────────────────
      const { upload_url, object_key } = await apiCall(
        "POST",
        "/api/v1/datasets/upload-url",
        {
          file_name: file.name,
          file_size: file.size,
          format,
          dataset_name: name,
        },
      );

      // ── Step 2: PUT file directly to MinIO with XHR (for progress) ─
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`MinIO upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () =>
          reject(new Error("Network error during upload")),
        );
        xhr.addEventListener("abort", () =>
          reject(new Error("Upload cancelled")),
        );

        xhr.open("PUT", upload_url);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.send(file);
      });

      // ── Step 3: Confirm with API → inserts DB record ──────────────
      const format2 = file.name.split(".").pop().toLowerCase();
      const ds = await apiCall("POST", "/api/v1/datasets", {
        object_key,
        file_name: file.name,
        file_size: file.size,
        format: format2,
        dataset_name: name,
      });

      setStatus("done");
      setProgress(100);
      onUploaded(ds);
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        setStatus("idle");
      }, 2000);
    } catch (err) {
      if (err.message !== "Upload cancelled") {
        setError(err.message);
        setStatus("error");
      }
    } finally {
      setUploading(false);
      xhrRef.current = null;
    }
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    setPaused(false);
    pausedRef.current = false;
    setUploading(false);
    setStatus("idle");
    setProgress(0);
  };

  return (
    <div>
      {!file ? (
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
              padding: "52px 40px",
              textAlign: "center",
              background: dragOver ? "var(--accent-glow)" : "var(--bg-surface)",
              transition: "all 0.2s",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <Upload size={22} color="var(--text-muted)" />
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Drop your dataset here
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                marginBottom: 18,
                fontSize: 13,
              }}
            >
              JSONL · CSV · TXT · up to 100 MB (larger files use multipart)
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
              <FolderOpen size={14} /> Browse file
              <input
                type="file"
                accept=".jsonl,.json,.csv,.txt"
                onChange={(e) => pickFile(e.target.files[0])}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
            }}
          >
            {[
              {
                icon: "{}",
                label: "JSONL",
                desc: '{"instruction":"...","output":"..."}',
              },
              { icon: "≡", label: "CSV", desc: "instruction, output columns" },
              { icon: "¶", label: "TXT", desc: "Q: ... A: ... pairs" },
            ].map((f) => (
              <Card key={f.label} style={{ padding: 14 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 18,
                    color: "var(--accent)",
                    marginBottom: 6,
                  }}
                >
                  {f.icon}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 3,
                  }}
                >
                  {f.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {f.desc}
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card style={{ marginBottom: 20 }}>
          {/* File info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-dim)",
                border: "1px solid var(--border-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={17} color="var(--accent)" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {fmt.bytes(file.size)} ·{" "}
                {file.name.split(".").pop().toUpperCase()}
              </div>
            </div>
            {!uploading && (
              <button
                onClick={() => {
                  setFile(null);
                  setStatus("idle");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Dataset name */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Dataset name
            </div>
            <input
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              disabled={uploading}
              placeholder="Give your dataset a name"
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "var(--font-body)",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--border-accent)")
              }
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Progress */}
          {(uploading || status === "done") && (
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {status === "done"
                    ? "Upload complete!"
                    : paused
                      ? "Paused"
                      : `Uploading… ${progress}%`}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  {progress}%
                </span>
              </div>
              <ProgressBar
                pct={progress}
                color={
                  status === "done"
                    ? "var(--green)"
                    : paused
                      ? "var(--amber)"
                      : "var(--accent)"
                }
              />
            </div>
          )}

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 12px",
                background: "var(--red-dim)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "var(--radius-md)",
                color: "var(--red)",
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {!uploading && status !== "done" && (
              <Btn
                variant="primary"
                onClick={uploadFile}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <Upload size={13} /> Upload dataset
              </Btn>
            )}
            {uploading && (
              <Btn
                onClick={cancelUpload}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <X size={13} /> Cancel
              </Btn>
            )}
          </div>
        </Card>
      )}

      <Divider />
      <InfoBox type="info">
        Files under 100 MB upload directly to MinIO via a presigned URL — no
        data passes through the API server. Larger files use multipart upload
        with 10 MB chunks.
      </InfoBox>
    </div>
  );
}

// ── HuggingFace tab ───────────────────────────────────────────────────
function HFTab({ onLoaded }) {
  const [hfInput, setHfInput] = useState("");
  const [hfSplit, setHfSplit] = useState("train");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (id) => {
    const dsId = (id || hfInput).trim();
    if (!dsId) return setError("Enter a dataset ID");
    setLoading(true);
    setError("");
    try {
      // Step 1: get dataset info to find available configs and splits
      const infoRes = await fetch(
        `https://datasets-server.huggingface.co/info?dataset=${encodeURIComponent(dsId)}`,
      );
      let config = "default";
      let split = hfSplit;
      if (infoRes.ok) {
        const info = await infoRes.json();
        const configs = Object.keys(info.dataset_info || {});
        if (configs.length > 0) config = configs[0];
        // Check if requested split exists, fall back to first available
        const splits = Object.keys(info.dataset_info?.[config]?.splits || {});
        if (splits.length > 0 && !splits.includes(split)) split = splits[0];
      }

      // Step 2: fetch rows with the discovered config
      const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dsId)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=0&length=100`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Dataset "${dsId}" not found or not public`,
        );
      }
      const data = await res.json();
      const rawRows = data.rows.map((r) => r.row);
      const keys = Object.keys(rawRows[0] || {});
      const iKey =
        keys.find((k) =>
          ["instruction", "input", "question", "prompt", "text"].includes(
            k.toLowerCase(),
          ),
        ) || keys[0];
      const oKey =
        keys.find((k) =>
          ["output", "response", "answer", "completion"].includes(
            k.toLowerCase(),
          ),
        ) || keys[1];
      const rows = rawRows.map((r) => ({
        instruction: String(r[iKey] || ""),
        output: String(r[oKey] || ""),
        _raw: r,
      }));
      onLoaded({
        rows,
        fileName: `${dsId} (${hfSplit})`,
        sourceType: "hf",
        datasetId: dsId,
        split: hfSplit,
        totalRows: data.num_rows_total || rows.length,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
            Public datasets · Free API · No token needed
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
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
            onKeyDown={(e) => e.key === "Enter" && !loading && load()}
            placeholder="e.g. unsloth/Radiology_mini"
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--border-accent)")
            }
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
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
            fontFamily: "var(--font-body)",
          }}
        >
          <option value="train">train</option>
          <option value="test">test</option>
          <option value="validation">validation</option>
        </select>
        <Btn
          variant="primary"
          onClick={() => load()}
          disabled={!hfInput.trim() || loading}
          style={{ whiteSpace: "nowrap" }}
        >
          {loading ? "Loading…" : "Load"}
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {HF_POPULAR.map((id) => (
          <button
            key={id}
            onClick={() => {
              setHfInput(id);
              load(id);
            }}
            disabled={loading}
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              padding: "3px 10px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            {id}
          </button>
        ))}
      </div>
      {error && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--red)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </Card>
  );
}

// ── My Datasets tab ───────────────────────────────────────────────────
function MyDatasetsTab({
  datasets,
  loading,
  onRefresh,
  onDelete,
  onEdit,
  onSelect,
  selectedId,
}) {
  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 0",
          color: "var(--text-muted)",
        }}
      >
        <RefreshCw
          size={20}
          style={{ animation: "spin 1s linear infinite", marginBottom: 8 }}
        />
        <div style={{ fontSize: 13 }}>Loading datasets…</div>
      </div>
    );

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Btn onClick={onRefresh} style={{ gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </Btn>
      </div>

      {datasets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-xl)",
            border: "1px dashed var(--border)",
          }}
        >
          <Database
            size={32}
            color="var(--text-muted)"
            style={{ marginBottom: 12 }}
          />
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: 6,
            }}
          >
            No datasets yet
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Upload a file or load from HuggingFace to get started
          </div>
        </div>
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {datasets.map((ds) => (
            <DatasetCard
              key={ds.id}
              ds={ds}
              selected={selectedId === ds.id}
              onDelete={onDelete}
              onEdit={onEdit}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}

// ── Preview section ───────────────────────────────────────────────────
function DatasetPreview({ rows, fileName, sourceType, onClear, onNext }) {
  const stats = {
    total: rows.length,
    avgLen: Math.round(
      rows.reduce(
        (a, r) => a + ((r.instruction || "") + (r.output || "")).length,
        0,
      ) / rows.length,
    ),
    hasInstruction: rows.filter((r) => r.instruction).length,
    hasOutput: rows.filter((r) => r.output).length,
  };
  return (
    <div
      style={{
        marginTop: 24,
        borderTop: "1px solid var(--border)",
        paddingTop: 24,
      }}
    >
      {/* File bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-accent)",
          marginBottom: 20,
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
            <span style={{ fontSize: 16 }}>🤗</span>
          ) : (
            <FileText size={15} color="var(--accent)" />
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
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {stats.total} rows loaded
          </div>
        </div>
        {sourceType === "hf" && <Tag color="blue">HuggingFace</Tag>}
        {sourceType === "sample" && <Tag color="amber">Sample</Tag>}
        {sourceType === "file" && <Tag color="accent">Uploaded</Tag>}
        <CheckCircle size={16} color="var(--accent)" />
        <button
          onClick={onClear}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Rows", value: stats.total },
          { label: "Avg length", value: `${stats.avgLen} chars` },
          { label: "Instructions", value: stats.hasInstruction },
          { label: "Outputs", value: stats.hasOutput },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--bg-raised)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              padding: "12px 14px",
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
                fontSize: 18,
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
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["#", "Instruction", "Output"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 14px",
                      textAlign: "left",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
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
                    borderBottom: i < 4 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {i + 1}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--text-secondary)",
                      maxWidth: 200,
                      wordBreak: "break-word",
                    }}
                  >
                    {(row.instruction || "").slice(0, 80)}
                    {(row.instruction || "").length > 80 ? "…" : ""}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--text-secondary)",
                      maxWidth: 260,
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

      <InfoBox type="success">
        Dataset ready! You're set to pick a base model.
      </InfoBox>
    </div>
  );
}

// ── Main DatasetPage ──────────────────────────────────────────────────
export default function DatasetPage({ job, setJob, onNext }) {
  const [tab, setTab] = useState("upload");
  const [datasets, setDatasets] = useState([]);
  const [dsLoading, setDsLoading] = useState(false);
  const [selectedDs, setSelectedDs] = useState(null); // dataset from My Datasets

  // In-memory preview (file/HF/sample — not yet in DB)
  const [preview, setPreview] = useState(null);

  // Fetch datasets from API
  const fetchDatasets = async () => {
    setDsLoading(true);
    try {
      const data = await apiCall("GET", "/api/v1/datasets");
      setDatasets(data.datasets || []);
    } catch {
      /* ignore */
    } finally {
      setDsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // When tab changes to My Datasets, refresh
  useEffect(() => {
    if (tab === "my") fetchDatasets();
  }, [tab]);

  const handleUploaded = (ds) => {
    setDatasets((prev) => [ds, ...prev]);
    setSelectedDs(ds);
    setJob((j) => ({
      ...j,
      dataset: { id: ds.id, name: ds.name, sourceType: "uploaded", rows: [] },
    }));
    setTab("my");
  };

  const handleHFLoaded = (data) => {
    setPreview(data);
    setJob((j) => ({
      ...j,
      dataset: {
        rows: data.rows,
        fileName: data.fileName,
        sourceType: "hf",
        datasetId: data.datasetId,
      },
    }));
  };

  const handleSample = () => {
    const data = {
      rows: SAMPLE_DATA,
      fileName: "sample_dataset.jsonl",
      sourceType: "sample",
    };
    setPreview(data);
    setJob((j) => ({ ...j, dataset: data }));
  };

  const handleSelectDs = (ds) => {
    setSelectedDs(ds);
    setJob((j) => ({
      ...j,
      dataset: { id: ds.id, name: ds.name, sourceType: "uploaded", rows: [] },
    }));
  };

  const handleDelete = async (id) => {
    try {
      await apiCall("DELETE", `/api/v1/datasets/${id}`);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      if (selectedDs?.id === id) {
        setSelectedDs(null);
        setJob((j) => ({ ...j, dataset: null }));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (id, name, description) => {
    setDatasets((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name, description } : d)),
    );
  };

  const ready = selectedDs || preview;

  const tabs = [
    { id: "upload", label: "Upload file", icon: Upload },
    { id: "hf", label: "HuggingFace", icon: Database },
    { id: "sample", label: "Sample data", icon: CheckCircle },
    {
      id: "my",
      label: "My datasets",
      icon: FolderOpen,
      badge: datasets.length || undefined,
    },
  ];

  return (
    <PageShell
      title="Dataset"
      subtitle="Upload training data, load from HuggingFace, or pick from your saved datasets."
      actions={
        ready && (
          <Btn variant="primary" onClick={onNext}>
            Next: Choose Model <ChevronRight size={14} />
          </Btn>
        )
      }
    >
      <Tabs
        active={tab}
        onChange={(t) => {
          setTab(t);
          if (t === "sample") handleSample();
        }}
        tabs={tabs}
      />

      {tab === "upload" && <UploadTab onUploaded={handleUploaded} />}

      {tab === "hf" && <HFTab onLoaded={handleHFLoaded} />}

      {tab === "sample" && !preview && (
        <Card style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Sample dataset — 5 instruction/output pairs
          </div>
          {SAMPLE_DATA.map((row, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                background: "var(--bg-raised)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: 3,
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
                  marginBottom: 3,
                }}
              >
                Output
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {row.output.slice(0, 100)}
                {row.output.length > 100 ? "…" : ""}
              </div>
            </div>
          ))}
          <Btn
            variant="primary"
            onClick={handleSample}
            style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
          >
            Use this sample dataset
          </Btn>
        </Card>
      )}

      {tab === "my" && (
        <MyDatasetsTab
          datasets={datasets}
          loading={dsLoading}
          onRefresh={fetchDatasets}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onSelect={handleSelectDs}
          selectedId={selectedDs?.id}
        />
      )}

      {/* Preview shown when file/HF/sample is loaded */}
      {preview && (tab === "hf" || tab === "sample") && (
        <DatasetPreview
          rows={preview.rows}
          fileName={preview.fileName}
          sourceType={preview.sourceType}
          onClear={() => {
            setPreview(null);
            setJob((j) => ({ ...j, dataset: null }));
          }}
          onNext={onNext}
        />
      )}

      {/* Selected dataset from My Datasets */}
      {selectedDs && tab === "my" && (
        <div style={{ marginTop: 20 }}>
          <InfoBox type="success">
            Selected: <strong>{selectedDs.name}</strong> — ready to pick a base
            model.
          </InfoBox>
        </div>
      )}
    </PageShell>
  );
}
