# Mabini-Tourism

A simple tourism site showcasing diving, snorkeling, and activities in Mabini, Batangas.

## AI Itinerary Setup

The site can generate custom itineraries via a small Node.js server using Google Gemini.

### 1) Configure your environment

- Copy `.env.example` to `.env` and set your key:

```powershell
GEMINI_API_KEY=your-gemini-key-here
GEMINI_MODEL=gemini-1.5-flash
PORT=3001
```

Note: `.env` is ignored by git (see `.gitignore`). Do not commit secrets.

### 2) Install dependencies

```powershell
npm install
```

### 3) Run the API server

```powershell
node scripts/ai-itinerary-api.js
```

The server listens on `http://localhost:3001` for local testing. The frontend posts to `/api/generate-itinerary` by default.
When deploying to Vercel, the backend is served from the `api/` directory, so the itinerary endpoint becomes `/api/generate-itinerary` on the deployed domain.
If you use a custom domain or preview URL, keep `window.__API_BASE__` in `index.html` pointed at that domain so the frontend calls the deployed backend.

### 4) Use the feature

- Open `index.html` in a static server (e.g., VS Code Live Server).
- Click `Plan Your Activities`, fill the form, and submit.

### Troubleshooting

- If you see `GEMINI_API_KEY is missing`, ensure your `.env` file exists and contains a valid key.
- If you see a `403` from Gemini, verify your key restrictions and model access in Google AI Studio.
 - Firewalls or ad-blockers can block `localhost` calls; allow `http://localhost:3001` during local testing.
 - When deployed, calls go to your configured `window.__API_BASE__` (set in `index.html`).
 - Adjust the `PORT` in `.env` if 3001 is taken; for deployed setups update `window.__API_BASE__` instead of editing `assets/js/main.js`.

## Admin announcements

- The announcements page uses Firebase custom claims to decide who can create new announcements.
- Add `ADMIN_UIDS` and/or `ADMIN_EMAILS` in `.env` as comma-separated values, then run `node scripts/set-admin-claim.js` to assign `admin: true` and `role: 'admin'`.
- Backward compatibility is supported: `ADMIN_UID` and `ADMIN_EMAIL` still work.
- The admin user signs in through the same login portal as everyone else, but the announcements composer only appears for users with the admin claim.

Quick: set admin claims locally (Windows PowerShell)

 - Ensure `firebase-admin` and `dotenv` are installed:

```powershell
npm install
```

 - Put your service account path and admin UIDs/emails in `.env` (no surrounding quotes):

```powershell
FIREBASE_SERVICE_ACCOUNT_PATH=C:\Users\Chen\Documents\tourism-mabini-firebase-adminsdk-fbsvc-6932563493.json
ADMIN_UID=WFok6gNoPjPuG8TTVNrqRYTmIy33,yf614GUQ2PZO0Jj7q2AhYuchS3n2
ADMIN_EMAIL=22-43307@g.batstate-u.edu.ph,18-56479@g.batstate-u.edu.ph
```

 - Run the helper npm script which loads `.env` and assigns admin claims:

```powershell
npm run set-admin
```

 - Or run directly with explicit args:

```powershell
node scripts/set-admin-claim.js --uid="WFok6gNoPjPuG8TTVNrqRYTmIy33,yf614GUQ2PZO0Jj7q2AhYuchS3n2" --serviceAccount="C:\Users\Chen\Documents\tourism-mabini-firebase-adminsdk-fbsvc-6932563493.json"
```

Notes:
- The script accepts comma-separated UIDs in `--uid` or `ADMIN_UID` and resolves `ADMIN_EMAIL` to UIDs automatically.
- The script revokes refresh tokens after updating claims so users must sign in again to pick up the new claim.
- Never commit your service account JSON or `.env` to source control.