# PatientAI Voice Tester - Engineering Challenge

## Overview
This application is an automated voice testing suite designed to stress-test AI medical assistants. It uses **Gemini Live API** to simulate realistic patient behaviors and **Twilio** to conduct real phone calls to the test line.

## Architecture
- **Frontend:** React + Tailwind CSS + Framer Motion. A clean, professional dashboard to manage test scenarios and review results.
- **Backend:** Node.js (Express) + WebSockets.
- **Voice Engine:** Gemini 2.5 Flash Live API. It handles real-time audio processing, acting as the "Patient" with natural voice and low latency.
- **Telephony:** Twilio Media Streams. Connects the phone call audio directly to our Gemini session.
- **Database:** SQLite (better-sqlite3) for persistent storage of transcripts, recordings, and bug reports.

## Key Design Choices
1. **Gemini Live API:** Chosen for its native multimodal capabilities. It can "hear" and "speak" without needing separate STT/TTS layers, reducing latency and making the conversation feel more human.
2. **Twilio Media Streams:** Allows for real-time, bi-directional audio. This is crucial for testing interruptions and natural flow.
3. **Integrated Bug Reporting:** The dashboard allows the tester to document issues immediately while reviewing the transcript and listening to the recording.

## Setup Instructions
1. **Environment Variables:**
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID.
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token.
   - `TWILIO_PHONE_NUMBER`: Your purchased Twilio number.
   - `GEMINI_API_KEY`: Provided by Google AI Studio.
   - `APP_URL`: The public URL of this app (needed for Twilio callbacks).

2. **Running the App:**
   - `npm install`
   - `npm run dev`

3. **Testing:**
   - Select a scenario from the dashboard.
   - Click "Start Test Call".
   - Review the transcript and recording in the "Call History" tab.
   - Document any bugs found in the "Bug Report" section.
