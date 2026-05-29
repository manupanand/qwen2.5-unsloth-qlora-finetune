import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import DatasetPage from "./pages/DatasetPage.jsx";
import ModelPage from "./pages/ModelPage.jsx";
import TrainPage from "./pages/TrainPage.jsx";
import EvalPage from "./pages/EvalPage.jsx";

const BASE = "/agent/view/finetune-llm";

function Studio() {
  const [page, setPage] = useState("dataset");
  const [theme, setTheme] = useState("dark");
  const [job, setJob] = useState({
    dataset: null,
    model: "mistral-7b",
    loraRank: 16,
    loraAlpha: 32,
    learningRate: 0.0002,
    epochs: 3,
    batchSize: 4,
    maxSeqLen: 512,
  });

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const pages = {
    dataset: (
      <DatasetPage job={job} setJob={setJob} onNext={() => setPage("model")} />
    ),
    model: (
      <ModelPage
        job={job}
        setJob={setJob}
        onNext={() => setPage("train")}
        onBack={() => setPage("dataset")}
      />
    ),
    train: (
      <TrainPage
        job={job}
        setJob={setJob}
        onNext={() => setPage("eval")}
        onBack={() => setPage("model")}
      />
    ),
    eval: <EvalPage job={job} />,
  };

  return (
    <div
      data-theme={theme}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar current={page} onNav={setPage} job={job} />
        <main
          style={{ flex: 1, overflowY: "auto", background: "var(--bg-base)" }}
        >
          {pages[page]}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route path="/" element={<Studio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
