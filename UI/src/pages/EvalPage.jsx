import { useState } from "react";
import { Download, Send, RotateCcw, CheckCircle, Package } from "lucide-react";
import {
  PageShell,
  Card,
  SectionLabel,
  Btn,
  Tag,
  Divider,
  InfoBox,
} from "../components/UI.jsx";

const EXAMPLE_PROMPTS = [
  "Explain quantum entanglement in simple terms",
  "Write a professional email declining a meeting",
  "What are 3 tips for better sleep?",
  "Summarize the French Revolution in 2 sentences",
];

function simulateResponse(prompt) {
  const responses = {
    "Explain quantum entanglement in simple terms":
      "Quantum entanglement is when two particles become so deeply connected that measuring one instantly affects the other — no matter how far apart they are. Imagine two magic coins: you flip one and it lands heads, and at that exact moment the other coin (across the universe) always lands tails. The 'magic' connection is what Einstein called 'spooky action at a distance.'",
    "Write a professional email declining a meeting":
      "Subject: Re: Meeting Request\n\nHi [Name],\n\nThank you for reaching out. Unfortunately, I'm unable to attend the meeting on [date] due to a prior commitment. I'd be happy to connect at another time — would [alternative date/time] work for you?\n\nBest regards,\n[Your name]",
    "What are 3 tips for better sleep?":
      "1. **Consistent schedule** — Go to bed and wake up at the same time every day, even on weekends. Your body's clock thrives on routine.\n\n2. **Wind-down ritual** — Dim lights and avoid screens 30–60 minutes before bed. Blue light suppresses melatonin production.\n\n3. **Cool, dark room** — Keep your bedroom between 65–68°F (18–20°C). Your core body temperature needs to drop to initiate sleep.",
  };
  return (
    responses[prompt] ||
    `Based on your fine-tuned model, here is a thoughtful response to: "${prompt}"\n\nThe model has been adapted to your specific data distribution, which means responses will reflect the style, tone, and knowledge you trained it on. This is a simulated output — your actual model will respond based on your training data.`
  );
}

export default function EvalPage({ job }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = async (text) => {
    const q = text || prompt;
    if (!q.trim()) return;
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 800));
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: simulateResponse(q) },
    ]);
    setLoading(false);
  };

  const reset = () => {
    setMessages([]);
    setPrompt("");
  };

  return (
    <PageShell
      title="Evaluate & Export"
      subtitle="Test your fine-tuned model and download the LoRA adapter."
    >
      {/* Export card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <Card
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--accent-dim)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle size={17} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Base model
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {job.model}
            </div>
          </div>
        </Card>
        <Card
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--amber-dim)",
              border: "1px solid rgba(212,168,67,0.3)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Package size={17} color="var(--amber)" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Adapter size
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              ~{job.loraRank * 2}MB
            </div>
          </div>
        </Card>
        <button
          onClick={() =>
            alert(
              "Download would save adapter_model.safetensors + adapter_config.json",
            )
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            background: "var(--accent)",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 13,
            color: "#0a0b0d",
          }}
        >
          <Download size={16} /> Download adapter
        </button>
      </div>

      <Divider />

      {/* Chat */}
      <div
        style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20 }}
      >
        {/* Prompts sidebar */}
        <div>
          <SectionLabel>Try a prompt</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-accent)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border)")
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <SectionLabel>Model chat</SectionLabel>
            {messages.length > 0 && (
              <button
                onClick={reset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={11} /> Clear
              </button>
            )}
          </div>

          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
            <div
              style={{
                minHeight: 280,
                maxHeight: 400,
                overflowY: "auto",
                padding: "16px",
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    height: 280,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 8,
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ fontSize: 28 }}>✦</div>
                  <div style={{ fontSize: 13 }}>
                    Your fine-tuned model is ready. Ask it anything.
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 16,
                      display: "flex",
                      gap: 10,
                      flexDirection: m.role === "user" ? "row-reverse" : "row",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          m.role === "user"
                            ? "var(--bg-raised)"
                            : "var(--accent-dim)",
                        border: `1px solid ${m.role === "user" ? "var(--border)" : "var(--border-accent)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          m.role === "user"
                            ? "var(--text-muted)"
                            : "var(--accent)",
                      }}
                    >
                      {m.role === "user" ? "U" : "✦"}
                    </div>
                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "10px 14px",
                        borderRadius:
                          m.role === "user"
                            ? "12px 4px 12px 12px"
                            : "4px 12px 12px 12px",
                        background:
                          m.role === "user"
                            ? "var(--bg-raised)"
                            : "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: "var(--text-primary)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--accent-dim)",
                      border: "1px solid var(--border-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    ✦
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "4px 12px 12px 12px",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--accent)",
                          opacity: 0.4,
                          animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask your fine-tuned model something…"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <Btn
              variant="primary"
              onClick={() => send()}
              disabled={!prompt.trim() || loading}
            >
              <Send size={14} />
            </Btn>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </PageShell>
  );
}
