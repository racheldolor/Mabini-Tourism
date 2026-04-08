# Mabini-Tourism

A simple tourism site showcasing diving, snorkeling, and activities in Mabini, Batangas.

## AI Itinerary Setup

The site can generate custom itineraries via a small Node.js server using OpenAI.

### 1) Configure your environment

- Copy `.env.example` to `.env` and set your key:

```powershell
OPENAI_API_KEY=sk-your-key-here
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

The server listens on `http://localhost:3001`. The frontend already posts to `/generate-itinerary`.

### 4) Use the feature

- Open `index.html` in a static server (e.g., VS Code Live Server).
- Click `Plan Your Activities`, fill the form, and submit.

### Troubleshooting

- If you see `OPENAI_API_KEY is missing`, ensure your `.env` file exists and contains a valid key.
- Firewalls or ad-blockers can block `localhost` calls; allow `http://localhost:3001`.
- Adjust the `PORT` in `.env` if 3001 is taken; the frontend URL can remain the same if you use a proxy, otherwise change the fetch URL in `assets/js/main.js`.

## Admin announcements

- The announcements page uses Firebase custom claims to decide who can create new announcements.
- Run `scripts/set-admin-claim.js` after replacing the target UID to assign `admin: true` and `role: 'admin'`.
- The admin user signs in through the same login portal as everyone else, but the announcements composer only appears for users with the admin claim.