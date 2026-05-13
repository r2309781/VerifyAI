import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!fullName || !email || !password) {
      setMessage("All fields are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Registration successful. Redirecting to login...");
        setTimeout(() => {
          navigate("/");
        }, 1200);
      } else {
        setMessage(data.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Signup error:", error);
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
          <h1>Create your account</h1>
          <p>
            Sign up to start analyzing webpages, text, and images with
            AI-powered credibility scoring.
          </p>

          <div className="info-box">
            <h3>What you can do</h3>
            <p>
              Submit URLs, images, and text for AI-based fact-checking and
              credibility analysis.
            </p>
          </div>

          <div className="info-box">
            <h3>Secure access</h3>
            <p>
              Your account lets you save submission history and access your
              results dashboard.
            </p>
          </div>
        </div>

        <div className="right-panel">
          <h2>Create account</h2>
          <p className="subtext">Join VerifyAI and start fact-checking smarter.</p>

          <form className="login-form" onSubmit={handleSignup}>
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="sign-in-btn" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {message && <p className="status-message">{message}</p>}

          <p className="footer-text">
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}