const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const pool = require("./db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function extractTextMetrics(reply) {
  const credibilityMatch = reply.match(/Credibility Score:\s*(\d+)\/100/i);
  const factual = credibilityMatch ? Number(credibilityMatch[1]) : 0;

  const claimsSection = reply.split(/Key Claims Checked:/i)[1] || "";
  const claims = (claimsSection.match(/^- /gm) || []).length;

  return {
    aiScore: Math.max(0, 100 - factual),
    factual,
    claims: claims || 0,
  };
}

function extractImageMetrics(reply) {
  const likelihoodMatch = reply.match(/AI Generation Likelihood:\s*(\d+)\/100/i);
  const aiLikelihood = likelihoodMatch ? Number(likelihoodMatch[1]) : 0;

  return {
    aiLikelihood,
  };
}

const documentUpload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, and DOCX files are allowed"));
    }
  },
});

const imageUpload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WEBP images are allowed"));
    }
  },
});

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

app.post("/api/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

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

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

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
- estimate how many distinct factual claims are being checked
- explain whether the claim appears reliable, misleading, false, or unclear
- keep the response concise and structured

User text:
"${text}"

Respond exactly in this format:

Credibility Score: X/100
Verdict: ...
Summary: ...
Reasoning: ...
Key Claims Checked:
- ...
`,
            },
          ],
        },
      ],
    });

    const reply = response.text || "I could not generate a fact-check response.";

    res.json({
      status: "success",
      reply,
      metrics: extractTextMetrics(reply),
    });
  } catch (error) {
    console.error("Fact check text error:", error);
    res.status(500).json({
      status: "error",
      message: "Fact-check request failed",
    });
  }
});

app.post("/api/fact-check-file", documentUpload.single("file"), async (req, res) => {
  let uploadedFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "File is required",
      });
    }

    uploadedFilePath = req.file.path;

    const geminiFile = await ai.files.upload({
      file: uploadedFilePath,
      config: {
        mimeType: req.file.mimetype,
        displayName: req.file.originalname,
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are VerifyAI Assistant.

Analyze the uploaded document.

Your task:
- identify the main claims in the file
- fact-check the claims as carefully as possible
- estimate a credibility score from 0 to 100
- explain whether the file appears reliable, misleading, false, or unclear
- mention if there is not enough evidence to verify something
- keep the response concise and structured

Uploaded file name: ${req.file.originalname}

Respond exactly in this format:

Credibility Score: X/100
Verdict: ...
Summary: ...
Reasoning: ...
Key Claims Checked:
- ...
`,
            },
            {
              fileData: {
                mimeType: geminiFile.mimeType,
                fileUri: geminiFile.uri,
              },
            },
          ],
        },
      ],
    });

    const reply = response.text || "I could not analyze the uploaded file.";

    res.json({
      status: "success",
      reply,
      metrics: extractTextMetrics(reply),
    });
  } catch (error) {
    console.error("File fact-check error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "File analysis failed",
    });
  } finally {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }
  }
});

app.post("/api/analyze-image", imageUpload.single("image"), async (req, res) => {
  let uploadedImagePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "Image is required",
      });
    }

    uploadedImagePath = req.file.path;

    const geminiImage = await ai.files.upload({
      file: uploadedImagePath,
      config: {
        mimeType: req.file.mimetype,
        displayName: req.file.originalname,
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are VerifyAI Image Forensics Assistant.

Analyze the uploaded image and make your best effort to determine whether it may be AI-generated, edited, manipulated, or likely authentic.

Important:
- Do not claim certainty.
- Be honest about uncertainty.
- Base your answer only on visible visual clues.
- Mention that AI-image detection is not perfect.
- Keep the response concise and structured.

Uploaded image name: ${req.file.originalname}

Respond exactly in this format:

AI Generation Likelihood: X/100
Verdict: ...
Visual Clues: ...
Reasoning: ...
Limitations: ...
`,
            },
            {
              fileData: {
                mimeType: geminiImage.mimeType,
                fileUri: geminiImage.uri,
              },
            },
          ],
        },
      ],
    });

    const reply = response.text || "I could not analyze the uploaded image.";

    res.json({
      status: "success",
      reply,
      metrics: extractImageMetrics(reply),
    });
  } catch (error) {
    console.error("Image analysis error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Image analysis failed",
    });
  } finally {
    if (uploadedImagePath && fs.existsSync(uploadedImagePath)) {
      fs.unlinkSync(uploadedImagePath);
    }
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      status: "error",
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      status: "error",
      message: error.message || "Upload failed",
    });
  }

  next();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});