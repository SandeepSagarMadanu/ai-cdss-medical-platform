# Deploying the AI Clinical Decision Support Platform (CDSS)

This guide provides a step-by-step walkthrough to deploy the frontend (Next.js) to **Vercel**, the backend (FastAPI) to **Render**, and setup a production-ready PostgreSQL database on **Supabase** or **Neon**.

---

## Prerequisites
- A [GitHub](https://github.com) account.
- A [Vercel](https://vercel.com) account (linked to GitHub).
- A [Render](https://render.com) account (linked to GitHub).
- A [Supabase](https://supabase.com) or [Neon](https://neon.tech) account for a free managed PostgreSQL database.
- A [Groq Console](https://console.groq.com) account and/or [Google AI Studio](https://aistudio.google.com) account for LLM API keys.

---

## Step 1: Push Your Project to GitHub

1. Open your terminal in the project root directory (`AI medical Agent`).
2. Initialize a Git repository (if not already done):
   ```bash
   git init
   ```
3. Create a `.gitignore` file in the root if you don't have one:
   ```text
   # Python
   .venv/
   __pycache__/
   *.pyc
   .pytest_cache/
   cdss_fallback.db
   uploads/
   
   # Node
   frontend/node_modules/
   frontend/.next/
   frontend/out/
   
   # Environment
   .env
   .env.local
   ```
4. Stage and commit your files:
   ```bash
   git add .
   git commit -m "Initial commit of AI Clinical Decision Support Platform"
   ```
5. Create a new repository on [GitHub](https://github.com/new). Name it something like `ai-cdss-platform`. Do not initialize it with a README or gitignore.
6. Link and push your local repository:
   ```bash
   git remote add origin https://github.com/<your-username>/ai-cdss-platform.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Set Up a Production PostgreSQL Database

To make sure your diagnostic logs, users, and reports persist:
1. Go to [Neon](https://neon.tech) or [Supabase](https://supabase.com) and create a free project.
2. Under the Database Settings, copy the **Connection String** (URI). It will look like this:
   ```text
   postgresql://<username>:<password>@<host>/<database>?sslmode=require
   ```
3. Keep this URI handy for Step 3.

---

## Step 3: Deploy the Backend on Render

Render is excellent for hosting Python FastAPI applications for free.

1. Log in to [Render](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`ai-cdss-platform`).
3. Configure the Web Service settings:
   - **Name**: `ai-cdss-backend`
   - **Environment**: `Python 3` (or choose Python if prompted)
   - **Root Directory**: `backend` (or leave empty if you want to run from the repository root)
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
     *(If running from the repository root, use `pip install -r backend/requirements.txt`)*
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
     *(If running from the repository root, use `python app.py` or `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`)*
4. Under **Advanced**, click **Add Environment Variable** and add:
   - `DATABASE_URL`: *[Paste your PostgreSQL Connection String from Step 2]*
   - `GROQ_API_KEY`: *[Your Groq API Key]*
   - `GEMINI_API_KEY`: *[Your Google AI Studio API Key]* (Optional, but recommended for fallback)
   - `SECRET_KEY`: *[Generate a random secure string for JWT generation]*
5. Click **Deploy Web Service**.
6. Once deployed, copy your backend URL (e.g., `https://ai-cdss-backend.onrender.com`).

---

## Step 4: Deploy the Frontend on Vercel

Vercel is the native platform for Next.js and is free and extremely fast.

1. Go to [Vercel](https://vercel.com) and click **Add New** -> **Project**.
2. Import your GitHub repository (`ai-cdss-platform`).
3. In the configure project screen:
   - **Framework Preset**: Next.js
   - **Root Directory**: Click Edit and select **`frontend`**.
4. Expand the **Environment Variables** section and add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: *[Paste your Render Backend URL from Step 3 without a trailing slash]* (e.g., `https://ai-cdss-backend.onrender.com`)
5. Click **Deploy**.
6. Vercel will build and deploy your frontend in about 1–2 minutes. It will provide you with a production URL (e.g., `https://ai-cdss-platform.vercel.app`).

---

## Step 5: Test & Seed Your Live Platform

1. Open your live Vercel URL in your browser.
2. Go to the Login screen.
3. Click the **Fast Track Demo Profiles** buttons (Doctor, Radiologist, Patient, Admin) to seed the database and sign in immediately! The database will automatically seed with default clinical records and users on first access.
4. Upload a scan and see the real-time AI Agent, RAG Literature citation search, and Grad-CAM medical viewer in action!
