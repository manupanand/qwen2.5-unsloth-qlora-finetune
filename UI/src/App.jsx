import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import DatasetPage from "./pages/DatasetPage.jsx";
import ModelPage from "./pages/ModelPage.jsx";
import TrainPage from "./pages/TrainPage.jsx";
import EvalPage from "./pages/EvalPage.jsx";

const BASE = "/agent/view/finetune-llm";

// ── Studio (protected) ────────────────────────────────────────────────
function Studio({ user, onSignOut, theme, onToggleTheme, authHeader }) {
  const [page, setPage] = useState("dataset");
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
      <Header
        theme={theme}
        onToggleTheme={onToggleTheme}
        user={user}
        onSignOut={onSignOut}
      />
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

// ── Protected route wrapper ───────────────────────────────────────────
function Protected({ user, children }) {
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// ── Root App ─────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const handleAuth = (userData) => setUser(userData);
  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  // Convenience: get auth header for API calls anywhere in the app
  const authHeader = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        {/* Public — auth page */}
        <Route
          path="/auth"
          element={
            user ? (
              <Navigate to="/" replace /> // already logged in → go to studio
            ) : (
              <AuthPage
                onAuth={handleAuth}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            )
          }
        />

        {/* Protected — studio */}
        <Route
          path="/"
          element={
            <Protected user={user}>
              <Studio
                user={user}
                onSignOut={handleSignOut}
                theme={theme}
                onToggleTheme={toggleTheme}
                authHeader={authHeader}
              />
            </Protected>
          }
        />

        {/* Catch-all → auth if not logged in, studio if logged in */}
        <Route
          path="*"
          element={<Navigate to={user ? "/" : "/auth"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
