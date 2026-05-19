# Frasers Property — Progress Claims Simulator

## Deploy to Vercel (Recommended — 5 minutes, free)

### Option A: Drag & Drop (Easiest)
1. Go to https://vercel.com and sign up for a free account
2. From your dashboard click **"Add New → Project"**
3. Click **"Import from your computer"** and upload this entire folder
4. Vercel auto-detects it as a Vite/React project
5. Click **Deploy** — done! You'll get a live URL like `frasers-simulator.vercel.app`

### Option B: Via GitHub (Best for updates)
1. Create a free account at https://github.com
2. Create a new repository (e.g. `frasers-simulator`)
3. Upload all files from this folder to the repo
4. Go to https://vercel.com → "Add New → Project" → Import from GitHub
5. Select your repo → Deploy
6. Any future file changes you push to GitHub will auto-redeploy

---

## Deploy to Netlify (Alternative — also free)
1. Go to https://netlify.com and sign up
2. Drag this entire folder onto the Netlify dashboard
3. Live URL generated instantly

---

## Run Locally (for testing before publishing)
You need Node.js installed (https://nodejs.org — download the LTS version).

Then open a terminal in this folder and run:
```
npm install
npm run dev
```
Open your browser to http://localhost:5173

---

## Share Internally (Microsoft Teams Tab)
Once deployed on Vercel/Netlify, you can embed the URL as a tab in a Teams channel:
1. Go to your Teams channel
2. Click the **+** button on the tab bar
3. Choose **Website**
4. Paste your Vercel/Netlify URL
5. Team members access it without leaving Teams

---

## Files in this project
```
frasers-simulator/
├── index.html          ← Entry HTML page
├── package.json        ← Project dependencies
├── vite.config.js      ← Build configuration
└── src/
    ├── main.jsx        ← React entry point
    └── App.jsx         ← The full simulator (edit this to make changes)
```

## Making Changes
All simulator content is in `src/App.jsx`. Open it in any text editor (Notepad, VS Code) to edit text, add vendors, change line items, etc.
