# 🙏 God Mind

> *"Ask and it will be given. Seek and you will find. Knock and the door will be opened."* — Matthew 7:7–8

---

## Deploy to Vercel

### Step 1 — Get your Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **API Keys** → **Create Key** → copy it

### Step 2 — Upload to GitHub
1. Go to [github.com](https://github.com) → your existing `GODMIND2` repo (or create new)
2. Delete all old files
3. Upload all files from this zip

### Step 3 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → your project → **Settings** → **General**
2. Set **Framework Preset** to **Vite**
3. Set **Root Directory** to `godmind` (if your files are inside a godmind folder)
4. Go to **Settings** → **Environment Variables** and add:
   - **Name:** `VITE_ANTHROPIC_API_KEY`
   - **Value:** your API key from Step 1
5. Go to **Deployments** → Redeploy

### ⚠️ Important — Environment Variable Name Changed
If you had `REACT_APP_ANTHROPIC_API_KEY` set before, add a new one:
- **Name:** `VITE_ANTHROPIC_API_KEY`  
- **Value:** same API key

---

## Run Locally

```bash
npm install
cp .env.example .env
# Add your API key to .env
npm run dev
# Opens at http://localhost:5173
```

---

## File Structure

```
godmind/
├── index.html          # Entry HTML (Vite puts this at root)
├── vite.config.js      # Vite config
├── package.json
├── .env.example        # Copy to .env and add API key
├── .gitignore
└── src/
    ├── main.jsx        # React entry point
    └── App.jsx         # Full God Mind app
```
