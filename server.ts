import express from "express";
import { createServer as createViteServer } from "vite";
import http from "http";
import twilio from "twilio";
import OpenAI from "openai";
import dotenv from "dotenv";
import { SCENARIOS } from "./src/constants.ts";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const PORT = 3000;
const db = new Database("calls.db");
const openai = new OpenAI(); // Uses OPENAI_API_KEY from environment

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    scenario_id TEXT,
    status TEXT,
    transcript TEXT DEFAULT '',
    recording_url TEXT,
    bug_report TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const server = http.createServer(app);

  // Debugging middleware
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
  });

  // API: Get calls
  app.get("/api/calls", (req, res) => {
    const calls = db.prepare("SELECT * FROM calls ORDER BY created_at DESC").all();
    res.json(calls);
  });

  // API: Trigger a call
  app.post("/api/call", async (req, res) => {
    const { scenarioId } = req.body;
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);

    if (!scenario) return res.status(400).json({ error: "Invalid scenario" });

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    const to = process.env.TARGET_PHONE_NUMBER || "+18054398008";

    if (!accountSid || !authToken || !from) {
      return res.status(500).json({ error: "Twilio credentials missing" });
    }

    const client = twilio(accountSid, authToken);
    const callId = uuidv4();

    try {
      db.prepare("INSERT INTO calls (id, scenario_id, status) VALUES (?, ?, ?)").run(
        callId,
        scenarioId,
        "initiated"
      );

      const appUrl = process.env.APP_URL?.replace(/\/$/, "");
      const call = await client.calls.create({
        url: `${appUrl}/twiml/${callId}`,
        to,
        from,
        record: true,
        recordingStatusCallback: `${appUrl}/api/recording-callback/${callId}`,
      });

      res.json({ success: true, callSid: call.sid, callId });
    } catch (error: any) {
      console.error("Twilio Call Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Update bug report
  app.post("/api/calls/:id/bug-report", (req, res) => {
    const { id } = req.params;
    const { bugReport } = req.body;
    db.prepare("UPDATE calls SET bug_report = ? WHERE id = ?").run(bugReport, id);
    res.json({ success: true });
  });

  // API: AI-generated bug report
  app.post("/api/calls/:id/ai-bug-report", async (req, res) => {
    const { id } = req.params;
    const call = db.prepare("SELECT * FROM calls WHERE id = ?").get(id) as any;
    if (!call) return res.status(404).json({ error: "Call not found" });

    try {
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a QA analyst evaluating an AI voice agent for a medical office. 
                Analyze the conversation transcript and identify bugs or quality issues.
                Focus on:
                - Did the agent introduce itself at the start?
                - Did the agent understand the patient's request correctly?
                - Were there any awkward pauses, repeated phrases, or unnatural responses?
                - Did the agent handle edge cases well (insurance, availability, etc.)?
                - Did the agent confirm details correctly before ending?
                - Any speech/TTS issues (wrong names, odd phrasing)?
                Be concise and specific. Format as a numbered list of issues found. If no issues, say so.`,
          },
          {
            role: "user",
            content: `Scenario: ${call.scenario_id}\n\nTranscript:\n${call.transcript}`,
          },
        ],
      });

      const bugReport = aiResponse.choices[0].message.content || "No issues found.";
      db.prepare("UPDATE calls SET bug_report = ? WHERE id = ?").run(bugReport, id);
      res.json({ success: true, bugReport });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API: Generate QA report as DOCX
  app.get("/api/qa-report", async (req, res) => {
    const calls = db.prepare("SELECT * FROM calls ORDER BY created_at DESC").all();
    const { execSync } = await import("child_process");
    const path = await import("path");
    const fs = await import("fs");
    
    const scriptPath = path.resolve("generate-qa-report.mjs");
    const payload = JSON.stringify({ calls });
    
    execSync(`node ${scriptPath} '${payload.replace(/'/g, "'\\''")}'`);
    
    const docPath = "/tmp/qa-report.docx";
    res.setHeader("Content-Disposition", "attachment; filename=qa-report.docx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(fs.readFileSync(docPath));
  });

  // API: Download transcript
  app.get("/api/calls/:id/download", (req, res) => {
    const { id } = req.params;
    const call = db.prepare("SELECT * FROM calls WHERE id = ?").get(id) as any;
    if (!call) return res.status(404).send("Call not found");

    const content = `CALL ID: ${call.id}\nSCENARIO: ${call.scenario_id}\nDATE: ${call.created_at}\n\nTRANSCRIPT:\n${call.transcript}\n\nBUG REPORT:\n${call.bug_report || "No bugs reported."}`;
    res.setHeader("Content-disposition", `attachment; filename=transcript_${id}.txt`);
    res.setHeader("Content-type", "text/plain");
    res.send(content);
  });

  // Twilio Recording Callback
  app.post("/api/recording-callback/:callId", (req, res) => {
    const { callId } = req.params;
    const { RecordingUrl } = req.body;
    db.prepare("UPDATE calls SET recording_url = ? WHERE id = ?").run(RecordingUrl + ".mp3", callId);
    res.sendStatus(200);
  });

  // TwiML Endpoint - Wait for agent to speak first
  app.post("/twiml/:callId", async (req, res) => {
    const { callId } = req.params;
    const call = db.prepare("SELECT scenario_id FROM calls WHERE id = ?").get(callId) as any;

    const response = new twilio.twiml.VoiceResponse();
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");

    // Wait for the agent to introduce themselves first (no greeting from our bot)
    response.gather({
      input: ["speech"],
      action: `${appUrl}/handle-response/${callId}`,
      speechTimeout: "3",
      language: "en-US",
    });

    res.type("text/xml");
    res.send(response.toString());
  });

  // Handle Response Webhook
  app.post("/handle-response/:callId", async (req, res) => {
    const { callId } = req.params;
    const speechResult = req.body.SpeechResult;
    const call = db.prepare("SELECT scenario_id, transcript FROM calls WHERE id = ?").get(callId) as any;
    const scenario = SCENARIOS.find((s) => s.id === call?.scenario_id);

    const response = new twilio.twiml.VoiceResponse();
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");

    if (speechResult) {
      console.log(`[Agent Text]: ${speechResult}`);
      db.prepare("UPDATE calls SET transcript = transcript || ? WHERE id = ?").run(
        `[Agent]: ${speechResult}\n`,
        callId
      );

      // Generate AI response based on conversation history
      const updatedCall = db.prepare("SELECT transcript FROM calls WHERE id = ?").get(callId) as any;

      // Check if this is the first agent turn (no [Patient] in transcript yet = no greeting yet)
      const isFirstTurn = !updatedCall.transcript.includes("[Patient]:");
      const userPrompt = isFirstTurn
        ? `The agent just introduced themselves: "${speechResult}"\n\nNow introduce yourself and state why you are calling. Keep it brief and natural.`
        : `Conversation history:\n${updatedCall.transcript}\n\nWhat is your next response? Keep it natural and brief.`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: scenario?.systemInstruction || "You are a patient calling a doctor.",
          },
          { role: "user", content: userPrompt },
        ],
      });

      const nextTurn = aiResponse.choices[0].message.content || "I'm sorry, I didn't catch that.";
      console.log(`[Patient Text]: ${nextTurn}`);

      db.prepare("UPDATE calls SET transcript = transcript || ? WHERE id = ?").run(
        `[Patient]: ${nextTurn}\n`,
        callId
      );

      const shouldHangUp = /goodbye|thank you.*bye|have a good|that's all i needed/i.test(nextTurn);

      if (shouldHangUp) {
        response.say({ voice: "Polly.Matthew-Neural" }, `<speak><prosody rate="medium">${nextTurn}</prosody></speak>`);
        response.hangup();
        db.prepare("UPDATE calls SET status = 'completed' WHERE id = ?").run(callId);
      } else {
        response.say({ voice: "Polly.Matthew-Neural" }, `<speak><prosody rate="medium">${nextTurn}</prosody></speak>`);
        response.gather({
          input: ["speech"],
          action: `${appUrl}/handle-response/${callId}`,
          speechTimeout: "3",
          language: "en-US",
        });
      }
    } else {
      // No speech detected — stay silent and keep listening (don't say anything)
      response.gather({
        input: ["speech"],
        action: `${appUrl}/handle-response/${callId}`,
        speechTimeout: "3",
        language: "en-US",
      });
    }

    res.type("text/xml");
    res.send(response.toString());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      base: "/",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();