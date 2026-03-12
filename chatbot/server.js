const express = require("express");
const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");
const path = require("path");

// --- Config ---
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const PORT = 3456;

const app = express();
app.use(express.json());

// CORS — allow all origins for dev
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Serve widget.js
app.get("/widget.js", function (req, res) {
  res.sendFile(path.join(__dirname, "widget.js"));
});

// --- Anthropic client ---
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// --- POST /api/chat ---
app.post("/api/chat", async function (req, res) {
  try {
    const { message, history, company, services } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const companyName = company || "our company";
    const serviceList = services || "general services";

    const systemPrompt =
      "You are a helpful assistant for " +
      companyName +
      ". Your job is to answer questions about their services, qualify leads, and collect contact info. Services: " +
      serviceList +
      ". Keep responses SHORT (2-3 sentences max). When you have collected the visitor's name and either phone or email, include [LEAD_CAPTURED] in your response.";

    // Build messages array from history
    const apiMessages = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    // Ensure the current message is included (history should already have it,
    // but if not, add it)
    if (
      apiMessages.length === 0 ||
      apiMessages[apiMessages.length - 1].content !== message
    ) {
      apiMessages.push({ role: "user", content: message });
    }

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      system: systemPrompt,
      messages: apiMessages,
    });

    const reply = response.content[0].text;
    const leadCaptured = reply.includes("[LEAD_CAPTURED]");
    const cleanReply = reply.replace(/\[LEAD_CAPTURED\]/g, "").trim();

    res.json({ reply: cleanReply, leadCaptured: leadCaptured });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({
      reply: "Sorry, I'm having trouble right now. Please try again shortly.",
      leadCaptured: false,
    });
  }
});

// --- POST /api/lead ---
app.post("/api/lead", function (req, res) {
  try {
    const { name, email, phone, company_name, message_summary } = req.body;

    if (!name && !email && !phone) {
      return res.status(400).json({ error: "At least one contact field required" });
    }

    const csvPath = path.join(__dirname, "leads.csv");
    const timestamp = new Date().toISOString();

    // Create CSV with header if it doesn't exist
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(
        csvPath,
        "timestamp,name,email,phone,company,summary\n"
      );
    }

    // Escape CSV fields
    function csvEscape(val) {
      var s = String(val || "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    var row =
      [
        csvEscape(timestamp),
        csvEscape(name),
        csvEscape(email),
        csvEscape(phone),
        csvEscape(company_name),
        csvEscape(message_summary),
      ].join(",") + "\n";

    fs.appendFileSync(csvPath, row);

    console.log(
      "Lead captured:",
      JSON.stringify({ timestamp, name, email, phone, company_name })
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Lead save error:", err.message);
    res.status(500).json({ error: "Failed to save lead" });
  }
});

// --- Start ---
app.listen(PORT, function () {
  console.log("Kyros chatbot server running on http://localhost:" + PORT);
  console.log("Widget URL: http://localhost:" + PORT + "/widget.js");
});
