import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import twilio from "twilio";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import dotenv from "dotenv";
import { SCENARIOS } from "./src/constants.ts";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const PORT = 3000;
const db = new Database("calls.db");

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
  const wss = new WebSocketServer({ server });

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

  // API: Download transcript
  app.get("/api/calls/:id/download", (req, res) => {
    const { id } = req.params;
    const call = db.prepare("SELECT * FROM calls WHERE id = ?").get(id) as any;
    if (!call) return res.status(404).send("Call not found");
    
    const content = `CALL ID: ${call.id}\nSCENARIO: ${call.scenario_id}\nDATE: ${call.created_at}\n\nTRANSCRIPT:\n${call.transcript}\n\nBUG REPORT:\n${call.bug_report || 'No bugs reported.'}`;
    res.setHeader('Content-disposition', `attachment; filename=transcript_${id}.txt`);
    res.setHeader('Content-type', 'text/plain');
    res.send(content);
  });

  // Twilio Recording Callback
  app.post("/api/recording-callback/:callId", (req, res) => {
    const { callId } = req.params;
    const { RecordingUrl } = req.body;
    db.prepare("UPDATE calls SET recording_url = ? WHERE id = ?").run(RecordingUrl + ".mp3", callId);
    res.sendStatus(200);
  });

  // TwiML Endpoint
  app.post("/twiml/:callId", (req, res) => {
    const { callId } = req.params;
    const appUrl = process.env.APP_URL?.replace(/\/$/, "").replace("https://", "wss://");
    
    const response = new twilio.twiml.VoiceResponse();
    const connect = response.connect();
    connect.stream({
      url: `${appUrl}/media-stream/${callId}`,
    });
    
    res.type("text/xml");
    res.send(response.toString());
  });

  // WebSocket handling for Media Streams
  wss.on("connection", (ws: WebSocket, req) => {
    const url = req.url || "";
    if (!url.includes("/media-stream/")) return;

    const callId = url.split("/").pop();
    console.log(`[Stream] Connected for call: ${callId}`);

    let streamSid: string | null = null;
    let geminiSession: any = null;

    const ai = new GoogleGenAI({ apiKey: process.env.OPENAI_API_KEY });
    const scenario = db.prepare("SELECT scenario_id FROM calls WHERE id = ?").get(callId) as any;
    const scenarioConfig = SCENARIOS.find(s => s.id === scenario?.scenario_id);

    // Connect to Gemini Live
    const connectGemini = async () => {
      try {
        geminiSession = await ai.live.connect({
          model: "gemini-2.5-flash-native-audio-preview-09-2025",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
            },
            systemInstruction: scenarioConfig?.systemInstruction || "You are a patient calling a doctor.",
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              // Handle audio output to Twilio
              if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                const audioBase64 = message.serverContent.modelTurn.parts[0].inlineData.data;
                console.log(`[Gemini] Sending audio chunk (${audioBase64.length} bytes)`);
                if (streamSid) {
                  ws.send(JSON.stringify({
                    event: "media",
                    streamSid,
                    media: { payload: audioBase64 }
                  }));
                }
              }
              
              // Log Patient (Gemini) transcription
              if (message.serverContent?.modelTurn?.parts[0]?.text) {
                const text = message.serverContent.modelTurn.parts[0].text;
                console.log(`[Gemini Text]: ${text}`);
                db.prepare("UPDATE calls SET transcript = transcript || ? WHERE id = ?").run(
                  `[Patient]: ${text}\n`,
                  callId
                );
              }

              // Log Agent (The test line) transcription
              const userTurn = (message.serverContent as any)?.userTurn;
              if (userTurn?.parts[0]?.text) {
                const text = userTurn.parts[0].text;
                console.log(`[Agent Text]: ${text}`);
                db.prepare("UPDATE calls SET transcript = transcript || ? WHERE id = ?").run(
                  `[Agent]: ${text}\n`,
                  callId
                );
              }
            },
            onopen: () => {
              console.log("[Gemini] Connection open");
              // Improved greeting logic: send a small piece of audio silence or wait for user
              if (geminiSession) {
                console.log("[Gemini] Ready to receive audio");
              }
            },
            onerror: (err) => console.error("[Gemini] Error:", err),
          }
        });
      } catch (err) {
        console.error("[Gemini] Connection failed:", err);
      }
    };

    connectGemini();

    ws.on("message", (message: string) => {
      const data = JSON.parse(message);
      switch (data.event) {
        case "start":
          streamSid = data.start.streamSid;
          console.log(`[Stream] Started: ${streamSid}`);
          break;
        case "media":
          if (geminiSession) {
            // Forward Twilio audio (8000Hz PCM) to Gemini
            geminiSession.sendRealtimeInput({
              media: { data: data.media.payload, mimeType: "audio/pcm;rate=8000" }
            });
          }
          break;
        case "stop":
          console.log("[Stream] Stopped");
          db.prepare("UPDATE calls SET status = ? WHERE id = ?").run("completed", callId);
          if (geminiSession) geminiSession.close();
          break;
      }
    });

    ws.on("close", () => {
      console.log("[Stream] WS Closed");
      if (geminiSession) geminiSession.close();
    });
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
