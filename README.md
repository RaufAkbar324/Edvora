# AssessIQ: AI-Based Assessment & Integrity System
React (Vite) frontend + Node/Express + MongoDB backend. Roles: student, teacher, admin (API only).

## Run
1. Backend: `cd backend && cp .env.example .env && npm i && npm run seed && npm run dev`
2. Frontend: `cd frontend && npm i && npm run dev`  (set `VITE_API` if the API is not on :5000)
Logins after seeding: `23-Arid-571` (student), `T-001` (teacher), `A-001` (admin); password `password`.
The login page also has "Try the demo", which runs the UI on sample data without a backend.

## Pipeline (matches the project plan)
Teacher task + AI rubric -> student submit (typed/code/scan) -> AI marks by meaning -> integrity signals
(similarity, shared rare errors, AI-content estimate) -> teacher approves/overrides -> student sees approved marks only.
`backend/server.js` uses heuristics by default. Set `AI_URL` to your Python (PyTorch / Hugging Face) service exposing
POST /grade, /ocr, /ai-detect, /rubric to switch to real models.
