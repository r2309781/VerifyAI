const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { GoogleGenAI } = require("@google/genai");
const pool = require("./db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Test route
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Backend running",
      time: result.rows[0],
    });
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "DB error" });
  }
});

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Email already exists",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, full_name, email`,
      [full_name, email, password_hash]
    );

    res.json({
      status: "success",
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    res.json({
      status: "success",
      message: "Login successful",
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// AI CHAT
app.post("/api/ai-chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        status: "error",
        message: "Message is required",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `You are VerifyAI Assistant. Help users with fact-checking, misinformation, credibility, and URL analysis. ` +
                `Keep answers concise, practical, and easy to understand.\n\nUser message: ${message}`,
            },
          ],
        },
      ],
    });

    const reply = response.text || "I could not generate a response.";

    res.json({
      status: "success",
      reply,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({
      status: "error",
      message: "AI request failed",
    });
  }
});

// FACT CHECK TEXT
app.post("/api/fact-check-text", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        status: "error",
        message: "Text is required",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are VerifyAI Assistant.

Your task:
- fact-check the user-provided text
- estimate a credibility score from 0 to 100
- explain whether the claim appears reliable, misleading, false, or unclear
- keep the response concise and structured

User text:
"${text}"

Respond exactly in this format:

Credibility Score: X/100
Verdict: ...
Summary: ...
Reasoning: ...
`,
            },
          ],
        },
      ],
    });

    const reply =
      response.text || "I could not generate a fact-check response.";

    res.json({
      status: "success",
      reply,
    });
  } catch (error) {
    console.error("Fact check text error:", error);
    res.status(500).json({
      status: "error",
      message: "Fact-check request failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});