import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./App.css";
import AIAgent from "./AIAgent";

const API_URL = "http://localhost:5000";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("verifyaiUser"));

  const [activeTab, setActiveTab] = useState("dashboard");
  const [textInput, setTextInput] = useState("");
  const [factCheckResult, setFactCheckResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("verifyaiUser");
    navigate("/");
  };

  const handleFactCheck = async (e) => {
    e.preventDefault();
    setFactCheckResult("");

    if (!textInput.trim()) {
      setFactCheckResult("Please enter text to fact-check.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/fact-check-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: textInput })
      });

      const data = await response.json();
      setFactCheckResult(response.ok ? data.reply : data.message || "Fact-check failed.");
    } catch {
      setFactCheckResult("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileFactCheck = async (file) => {
    if (!file) return;

    setSelectedFileName(file.name);
    setFactCheckResult("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/fact-check-file`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      setFactCheckResult(response.ok ? data.reply : data.message || "File analysis failed.");
    } catch {
      setFactCheckResult("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const DocumentUploadBox = ({ large = false }) => (
    <label className={`va-upload-box ${large ? "tall" : ""}`}>
      <input
        type="file"
        accept=".pdf,.txt,.docx"
        hidden
        onChange={(e) => handleFileFactCheck(e.target.files[0])}
      />
      <div className="va-upload-icon">⇧</div>
      <strong>{selectedFileName || "Upload Document"}</strong>
      <span>PDF, TXT, DOCX {large ? "(Max 10MB)" : ""}</span>
      {loading && <span>Analyzing file...</span>}
    </label>
  );

  return (
    <div className="va-app">
      <nav className="va-navbar">
        <div className="va-brand">
          <div className="va-logo">🛡</div>
          <span>VerifyAI</span>
        </div>

        <div className="va-navlinks">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={activeTab === "fact" ? "active" : ""} onClick={() => setActiveTab("fact")}>Fact-Check</button>
          <button className={activeTab === "image" ? "active" : ""} onClick={() => setActiveTab("image")}>Image Analysis</button>
          <button className={activeTab === "archive" ? "active" : ""} onClick={() => setActiveTab("archive")}>Archive</button>
        </div>

        <button className="va-login-btn" onClick={handleLogout}>Logout</button>
      </nav>

      <main className="va-main">
        {activeTab === "dashboard" && (
          <>
            <div className="va-searchbar">
              <input
                placeholder="Enter URL or text to fact-check..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <button onClick={handleFactCheck}>{loading ? "Checking..." : "Verify"}</button>
            </div>

            <div className="va-grid-2">
              <section className="va-card">
                <h3>▣ Text Analysis</h3>
                <DocumentUploadBox />

                <div className="va-stat-row">
                  <div><span>AI Score</span><strong className="green">2%</strong></div>
                  <div><span>Factual</span><strong>87%</strong></div>
                  <div><span>Claims</span><strong>12</strong></div>
                </div>
              </section>

              <section className="va-card">
                <h3>▧ Image Forensics</h3>
                <div className="va-upload-box">
                  <div className="va-upload-icon">⇧</div>
                  <strong>Upload Image</strong>
                  <span>JPG, PNG, WEBP</span>
                </div>

                <div className="va-score-box">
                  <span>Credibility Score</span>
                  <strong>92</strong>
                  <p>Likely Real</p>
                </div>
              </section>
            </div>

            {factCheckResult && (
              <div className="va-card va-result">
                <h3>Analysis Result</h3>
                <p>{factCheckResult}</p>
              </div>
            )}
          </>
        )}

        {activeTab === "fact" && (
          <section>
            <h1>Fact-Check Analysis</h1>
            <p className="va-muted">Verify claims using AI-powered fact-checking</p>

            <div className="va-card va-large-card">
              <h3>⌕ Enter Claim or URL</h3>

              <form onSubmit={handleFactCheck}>
                <textarea
                  className="va-textarea"
                  placeholder="Enter a claim, article text, or URL to fact-check..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />

                <div className="va-or">OR</div>

                <DocumentUploadBox large />

                <button className="va-primary-btn" disabled={loading}>
                  {loading ? "Checking..." : "Run Fact Check"}
                </button>
              </form>
            </div>

            {factCheckResult && (
              <div className="va-card va-result">
                <h3>Result</h3>
                <p>{factCheckResult}</p>
              </div>
            )}
          </section>
        )}

        {activeTab === "image" && (
          <section>
            <h1>Image Forensics</h1>
            <p className="va-muted">Detect manipulated images using advanced forensic analysis</p>

            <div className="va-card va-large-card">
              <h3>▧ Upload Image</h3>
              <div className="va-upload-box image-upload">
                <div className="va-upload-icon big">⇧</div>
                <strong>Drop image here or click to upload</strong>
                <span>JPG, PNG, WEBP, GIF (Max 25MB)</span>
              </div>
            </div>
          </section>
        )}

        {activeTab === "archive" && (
          <section>
            <div className="va-page-head">
              <div>
                <h1>Archive</h1>
                <p className="va-muted">View and manage your fact-checking history</p>
              </div>
              <button className="va-primary-btn small">Export</button>
            </div>

            <div className="va-stats-grid">
              <div className="va-card"><span>Total Analyses</span><strong>10</strong></div>
              <div className="va-card"><span>Text Checks</span><strong>6</strong></div>
              <div className="va-card"><span>Image Checks</span><strong>4</strong></div>
              <div className="va-card"><span>Avg Credibility</span><strong>57%</strong></div>
            </div>

            <div className="va-filter-card">
              <input placeholder="Search archive..." />
              <select><option>All Types</option></select>
              <select><option>All Status</option></select>
            </div>

            <div className="va-archive-item">
              <h3>Global temperatures reached record highs in 2025</h3>
              <p>Mar 4, 2026 • Source: Climate.gov</p>
              <div className="va-progress"><span style={{ width: "95%" }}></span></div>
              <strong>95%</strong>
            </div>
          </section>
        )}
      </main>

      <AIAgent />
    </div>
  );
}