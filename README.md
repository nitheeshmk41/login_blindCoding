# LOGIN 2K26 // BLIND CODING ARENA

A high-performance, real-time Blind Coding Contest Platform built for the **35th National Technical Symposium** (PSG College of Technology · Department of Computer Applications).

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and an **AI Reverse Marking Evaluation Engine**.

---

## 🚀 Key Features

### 1. Hardcore Blind Coding Experience
- **Problem 1 (Medium Linked Lists · *Add Two Numbers*)**:
  - **Blurred IDE**: Editor text is blurred (`filter: blur(6px)`).
  - **Selection Disabled**: Mouse drag, double-click, keyboard text selection (`Ctrl+A`, `Cmd+A`, `Shift+Arrows`), copy, and cut are blocked.
  - **Pure Scratchpad**: Blank black editor by default (no boilerplate provided).
- **Problem 2 (Medium Queues · *Design Circular Queue*)**:
  - **Blackout IDE**: Transparent characters with solid red caret.
  - **No Backspace / Delete**: `Backspace`, `Delete`, `Ctrl+H`, and `Alt+Backspace` keys are strictly intercepted and disabled.
  - **Pure Scratchpad**: Blank black editor by default (no boilerplate provided).

### 2. Anti-Cheat & Fullscreen Proctoring
- **Fullscreen Arena**: Participants are locked into fullscreen mode during the contest.
- **Tab Switching & Focus Loss Detection**:
  - **Tries 1 & 2**: Warnings displayed prompting immediate return to fullscreen.
  - **Tries 3+**: **-10 marks penalty** per tab switch deducted directly from final contest score.
  - Modal overlay enforces user click to restore browser fullscreen.

### 3. Reverse Marking Evaluation Engine (Base 100 Marks)
- Every participant starts with a perfect **100 marks**.
- Evaluates code statically (no compiling or execution needed):
  - **Syntax Errors**: Missing semicolons, brackets, pointer dereference bugs (`-5` to `-10` PTS each).
  - **Logic Flaws**: Infinite loops, pointer advance failures, circular modulo wrapping errors (`-10` to `-20` PTS each).
  - **Edge Cases**: Empty list/queue, single node, null checks, trailing carry (`-5` to `-10` PTS each).
  - **Tab Switch Penalty**: Deductions for exceeding 2 tab switches.
- **Multi-Engine Evaluation**:
  - Google Gemini API (`gemini-1.5-flash`)
  - Local Ollama AI (`http://localhost:11434` / `llama3`)
  - OpenAI API (`gpt-4o-mini`)
  - Built-in Strict Multi-Pass AST Static Inspector (offline fallback)

### 4. Admin Console (`/admin`)
- **Passcode**: `bc-admin`
- Start & reset contest.
- Real-time participant roster (Name, Email, Phone, Status, Score).
- Configure AI evaluation provider on the fly.
- Manual grading override suite to adjust marks and itemized deductions.

---

## 🌐 Deploying to Vercel

### Option 1: Deploy with Vercel CLI (Fastest)

1. Open terminal in the project folder:
   ```bash
   cd /home/nitheesh/Desktop/final
   ```

2. Run Vercel deploy:
   ```bash
   npx vercel
   ```
   Follow the prompts to link your Vercel account and deploy.

3. To deploy to production:
   ```bash
   npx vercel --prod
   ```

### Option 2: Deploy via GitHub

1. Commit and push this directory to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: complete blind coding arena with blur, no-backspace, proctoring & evaluation"
   git push origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your GitHub repository.
4. Set the Framework Preset to **Next.js**.
5. Add the optional Environment Variables (below).
6. Click **Deploy**.

---

## ⚙️ Environment Variables (Optional)

In your Vercel Project Settings (`Settings -> Environment Variables`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | Security password to access `/admin` | `bc-admin` |
| `GEMINI_API_KEY` | Google Gemini API Key for AI evaluation | *Optional* |
| `OPENAI_API_KEY` | OpenAI API Key for AI evaluation | *Optional* |
| `NEXT_PUBLIC_OLLAMA_URL` | Local Ollama endpoint (if hosted remotely) | `http://localhost:11434` |

*Note: If no AI API key is configured, the platform automatically utilizes its built-in rule-based AST Static Code Inspector.*

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev
```

Visit:
- **Participant Arena**: `http://localhost:3000` (Access Code: `BLIND2026`)
- **Admin Console**: `http://localhost:3000/admin` (Password: `bc-admin`)
