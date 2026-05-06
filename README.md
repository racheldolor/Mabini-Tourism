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