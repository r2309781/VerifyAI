import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email || !password) {
      setMessage("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("verifyaiUser", JSON.stringify(data.user));
        navigate("/dashboard");
      } else {
        setMessage(data.message || "Login failed.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="left-panel">
          <div className="badge">VerifyAI</div>
          <h1>Detect misleading content with clarity.</h1>
          <p>
            VerifyAI helps users analyze webpages, text, and images with
            AI-powered credibility scoring and clear explanations.
          </p>

          <div className="info-box">
            <h3>Features</h3>
            <p>
              URL credibility analysis, image authenticity checks, and fact-check
              chatbot support.
            </p>
          </div>

          <div className="info-box">
            <h3>Platform</h3>
            <p>
              Secure cloud-backed analysis with a clean and modern user
              experience.
            </p>
          </div>
        </div>

        <div className="right-panel">
          <h2>Welcome back</h2>
          <p className="subtext">Sign in to your account to continue.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="row">
              <label className="remember">
                <input type="checkbox" />
                Remember me
              </label>
              <span className="secure">Secure sign-in</span>
            </div>

            <button type="submit" className="sign-in-btn" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {message && <p className="status-message">{message}</p>}

          <div className="divider">or</div>

          <div className="button-row">
            <button type="button" className="alt-btn">Continue with Google</button>
            <button type="button" className="alt-btn">Continue as Guest</button>
          </div>

          <p className="footer-text">
            Don&apos;t have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}