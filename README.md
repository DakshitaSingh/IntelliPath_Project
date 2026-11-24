# AI Learning Assistant

A full-stack AI-powered study platform built with the MERN stack (MongoDB, Express, React, Node.js) and Google Gemini. 

## Features
1. JWT authentication (signup/login)
2. PDF upload & management with file size tracking
3. In-app document content viewer
4. AI chat about your documents (context-aware, using Gemini)
5. One-click AI document summaries
6. AI concept explainer for any topic in a document
7. Auto-generated flashcards with flip animation
8. AI quiz generator (configurable question count)
9. Quiz results with score breakdown & explanations
10. Dashboard with document/flashcard/quiz stats and recent activity
11. Favorites system for flashcards
12. Responsive, mobile-friendly UI (Tailwind CSS)
13. **Module 3 — AI Career Prediction & Guidance**: ML-based career assessment, top career recommendations with match scores, skill-gap analysis, and a personalized learning roadmap (see below)

## Project structure
```
ai-learning-assistant/
├── backend/     Express + MongoDB API, Gemini integration
├── ml-service/  Python/Flask ML microservice for Module 3 career prediction
└── frontend/    React + Vite + Tailwind CSS
```

## Prerequisites
- Node.js 18+
- A MongoDB connection string (MongoDB Atlas works great)
- A free Google Gemini API key: https://aistudio.google.com/app/apikey

## 1. Backend setup
```bash
cd backend
npm install
cp .env.example .env
```
Edit `.env` and fill in:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_long_random_string
GEMINI_API_KEY=your_google_gemini_api_key
CLIENT_URL=http://localhost:5173
```
Run it:
```bash
npm run dev
```
The API starts on `http://localhost:5000`.

## 2. Frontend setup
```bash
cd frontend
npm install
npm run dev
```
The app starts on `http://localhost:5173` and proxies `/api` and `/uploads` requests to the backend (see `vite.config.js`), so no extra CORS setup is needed in dev.

## 3. Using the app
1. Sign up for an account.
2. Go to **Documents → Upload Document** and add a PDF (up to 10MB).
3. Open the document to:
   - Read the extracted text (**Content** tab)
   - Chat with an AI about the document (**AI Chat** tab)
   - Generate a summary, explain a concept, or generate flashcards/a quiz (**AI Actions** tab)
4. Review flashcards under **Flashcards** (click a card to flip it, star to favorite).
5. Take quizzes under **Quizzes** and review your scored results with explanations.
6. Check your **Dashboard** for stats and recent activity.

## Notes on the AI integration
- Uses `gemini-1.5-flash` via `@google/generative-ai`. Swap the model name in `backend/utils/gemini.js` if you'd like to use a different Gemini model.
- PDF text is extracted server-side with `pdf-parse` at upload time and stored on the document, so summaries/chat/flashcards/quizzes all use that extracted text as context (truncated to a safe length for prompts).
- Flashcards and quiz questions are requested from Gemini as raw JSON and parsed server-side — if generation ever fails, check your `GEMINI_API_KEY` and rerun.

## Deployment tips
- Backend: deploy to Render/Railway; set the same env vars as `.env.example`, and mount a persistent disk (or swap to S3/Cloudinary) if you need uploaded PDFs to survive restarts.
- Frontend: deploy to Vercel/Netlify; set `VITE`-style env var or update `vite.config.js`'s proxy target / add an `axios` baseURL pointing at your deployed backend URL.

## Module 3 — AI Career Prediction & Guidance

Adds a full career-guidance flow on top of the existing app: **Career Guidance → Assessment → Results (predictions, skill gaps, roadmap, resources)**.

```
backend/
├── models/CareerProfile.js          # stores each assessment + prediction + roadmap
├── controllers/careerController.js  # /api/career/* handlers
├── routes/careerRoutes.js
└── utils/
    ├── mlServiceClient.js           # calls the Python ML service
    ├── careerSkillsMap.js           # career -> required skills taxonomy
    ├── skillGapAnalyzer.js          # compares student skills vs required
    ├── roadmapGenerator.js          # builds phased roadmap from gaps
    └── learningResources.js         # skill -> curated learning resources

ml-service/                          # standalone Python/Flask microservice
├── train_model.py                   # trains + evaluates + saves the model
├── app.py                           # serves POST /predict-career
├── data/student_career_dataset.csv  # dataset (see ml-service/README.md)
└── models/                          # generated: pipeline, encoder, metadata.json

frontend/src/pages/
├── CareerGuidance.jsx                # landing + history
├── CareerAssessment.jsx              # multi-step assessment form
└── CareerResults.jsx                 # predictions, skill gaps, roadmap
```

### Running Module 3
```bash
# 1. Train the model (one-time, or whenever you want to retrain)
cd ml-service
pip install -r requirements.txt
python train_model.py

# 2. Start the ML service (separate terminal, keep running)
python app.py                       # http://localhost:8001

# 3. Add to backend/.env
ML_SERVICE_URL=http://localhost:8001

# 4. Start backend + frontend as usual (npm run dev in each)
```

See `ml-service/README.md` for full dataset statistics, the model comparison, and why Random Forest was selected over the highest-raw-F1 Decision Tree.


## Chrome Learning Companion (Manifest V3)

The project now includes an `extension/` directory containing **Learn with My Platform**, a thin Chrome client for the existing authenticated learning platform. It does not introduce a second database, user system, AI provider, quiz engine, or flashcard store.

### Architecture

```text
Any webpage
   │
   ├── select text / right-click
   ▼
Chrome Learning Companion
   │
   ├── Add to My Learning ──────┐
   ├── Explain ─────────────────┤
   ├── Generate Quiz ───────────┤
   └── Generate Flashcards ─────┤
                                ▼
                        Existing Express API
                                │
                  ┌─────────────┼─────────────┐
                  ▼             ▼             ▼
             MongoDB       Gemini service   Existing
             resources     (backend only)   quiz/flashcard
                  │                           services
                  └─────────────┬─────────────┘
                                ▼
                         Existing React app
```

### What changed

- `Document` now supports `type: PDF | WEB`.
- Web resources reuse the existing `Document` collection and user relationship.
- Web resources preserve `sourceUrl`, `sourceDomain`, and a SHA-256 `contentHash`.
- `POST /api/documents/web` saves selected web content with the authenticated user.
- `POST /api/ai/web/explain` uses the existing `utils/gemini.js` service; no API key is exposed to the extension.
- Existing `/api/quizzes/generate` and `/api/flashcards/generate` are reused after a web selection is saved as a normal learning resource.
- The existing Documents page shows PDF and Web Resource items together.
- Existing Document Detail, quiz, flashcard, authentication, career and book functionality remains in place.

### Extension setup

The extension is plain Manifest V3 JavaScript and has no separate package install/build step.

1. Start the backend on `http://localhost:5000`.
2. Start the frontend on `http://localhost:5173`.
3. Open Chrome and visit `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the repository's `extension/` directory.
7. Pin **Learn with My Platform** if desired.
8. Open the extension and sign in with the same account used by the web app.
9. Select text on a normal webpage and use the extension popup or right-click context menu.

### Extension authentication

The extension calls the existing `/api/auth/login` endpoint and stores the returned JWT in `chrome.storage.local`. Every protected API call sends that JWT as `Authorization: Bearer <token>`. The backend continues to derive ownership from `req.user`; the extension never sends a trusted user ID.

### Extension configuration

The popup contains development settings for:

- Backend API URL — default `http://localhost:5000/api`
- Web app URL — default `http://localhost:5173`

For production, update the extension's `host_permissions` in `extension/manifest.json` to the deployed API origin and configure `EXTENSION_ORIGINS` in the backend environment with the actual `chrome-extension://<extension-id>` origin.

Example backend environment addition:

```text
EXTENSION_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
```

Do not place Gemini, MongoDB, JWT, or other backend secrets in the extension.

### Extension actions

**Add to My Learning**
- Saves selected text, page title, source URL and source domain.
- Reuses the existing MongoDB `Document` collection.
- Repeated identical user/source/content selections are returned as an existing resource.

**Explain**
- Sends selected content to the existing backend AI layer.
- Uses the existing Gemini client and its retry/fallback behavior.
- The Gemini key never reaches Chrome.

**Generate Quiz**
- Saves the selection as a Web Resource.
- Calls the existing `/api/quizzes/generate` implementation.
- The resulting quiz is stored in the existing `Quiz` collection and opens in the existing quiz UI.

**Generate Flashcards**
- Saves the selection as a Web Resource.
- Calls the existing `/api/flashcards/generate` implementation.
- The resulting set is stored in the existing flashcard collections and opens in the existing flashcard UI.

### Error handling

The extension handles:
- empty selections
- selections above 50,000 characters
- unauthenticated use
- invalid source URLs
- duplicate web resources
- backend/network failures
- AI failures
- quiz/flashcard generation failures
- restricted browser pages where content scripts cannot run

### Testing checklist

For local verification:

- [ ] Existing signup/login still works.
- [ ] Existing PDF upload and document detail still work.
- [ ] Existing AI chat/summary/explain still work.
- [ ] Existing quiz generation/taking/results still work.
- [ ] Existing flashcard generation/review still work.
- [ ] Career Guidance remains available.
- [ ] Book Recommendations remain available.
- [ ] Extension login uses the same backend account.
- [ ] Selected text is detected in the popup.
- [ ] Add to My Learning creates a `WEB` document.
- [ ] Web resource appears in Documents.
- [ ] Source URL opens the original page.
- [ ] Explain returns backend-generated content.
- [ ] Generate Quiz creates an existing-platform quiz.
- [ ] Generate Flashcards creates an existing-platform set.
- [ ] Context-menu actions work for selected text.
- [ ] Empty/long selection errors are friendly.
- [ ] Unauthorized API calls return 401.
- [ ] CORS rejects unconfigured normal web origins.

### Reference projects

The extension UX/architecture was informed by the requested open-source references without importing their backend, database, authentication, or AI systems:
- Carden: contextual knowledge capture and learning continuity.
- QuizMe: Manifest V3 background/content/popup separation and readable web-content workflow.
- Flash Card GPT: selected-text-to-flashcard interaction.

The existing AI Learning Assistant remains the source of truth; these projects are reference material only.
