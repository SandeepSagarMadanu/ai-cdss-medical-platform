# AI Clinical Decision Support Platform (CDSS)

AI Clinical Decision Support Platform (CDSS) is a production-grade, multi-agent AI Clinical Decision Support Platform designed to assist healthcare professionals in analyzing medical images, performing literature-backed RAG search audits, generating explainable findings reports, and translating clinical insights for patients.

---

## ⚠️ Regulatory Notice & Clinical Disclaimer

AI Clinical Decision Support Platform (CDSS) is an Artificial Intelligence-based Clinical Decision Support Tool designed for medical education and secondary diagnostic consultation. **It does not replace the professional clinical judgment of a licensed medical practitioner.** No therapeutic or diagnostic actions should be taken solely based on this system's summaries. Final responsibility for all diagnostic decisions rests strictly with the treating physician.

---

## Key Features

1. **Explainable AI (XAI)**:
   - PyTorch-based Grad-CAM mapping running on convolutional backbones (ResNet-50) to project visual attention hotspots over lesions and anomalies.
   - Dynamic threshold and opacity adjustment overlays mimicking a real DICOM viewer.
2. **Authoritative Literature Retrieval (RAG)**:
   - Search indexing over WHO guidelines, NIH clinical trial summaries, and PubMed abstracts.
   - Computes relevance vectors and ranks snippets to inject clickable citations in clinical reports.
3. **LangGraph Multi-Agent Orchestration**:
   - Sequential collaboration between specialized agents: Supervisor agent, Image analyst agent, Literature retrieval agent, Report generator agent, and Verification agent.
4. **Role-Based Access Control (RBAC)**:
   - Configures roles (`Administrator`, `Doctor`, `Radiologist`, `Patient`).
   - Restricts API access (e.g. system audit logs are restricted strictly to Administrators).
5. **Clinician & Patient Report Bifurcation**:
   - Clinician mode provides diagnostic findings, differential diagnoses, ICD-10 suggestions, and citation linkages.
   - Patient mode provides plain-language analogies, reassurance, and consultations guidance.

---

## Folder Structure

```
AI medical Agent/
├── backend/                  # FastAPI Backend Application
│   ├── app/
│   │   ├── main.py           # Application bootstrap and middleware
│   │   ├── core/             # Configuration, databases, and JWT security
│   │   ├── models/           # SQLAlchemy database schemas
│   │   ├── schemas/          # Pydantic request-response schemas
│   │   ├── routers/          # API Route controllers (auth, scans, reports)
│   │   ├── services/         # Image processor, RAG engine, XAI mappings
│   │   └── agents/           # LangGraph multi-agent flow
│   ├── tests/                # pytest unit and integration test suite
│   ├── Dockerfile            # Backend Docker image config
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js Frontend Application
│   ├── app/                  # Next.js App Router (pages and layouts)
│   ├── components/           # Core UI Widgets (DICOM viewer, reports, chatbot)
│   ├── lib/                  # API client tools
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Tailwind color tokens and theme parameters
│   └── tsconfig.json         # TypeScript configuration
├── docker-compose.yml        # Multi-container orchestration
├── app.py                    # Root wrapper to run backend
├── .env.example              # Template config parameters
└── README.md                 # System documentation
```

---

## System Architecture

```
User (Clinician / Patient)
       │
       ▼ (HTTPS / WSS)
Next.js Frontend (Port 3000)
       │
       ▼ (Reverse Proxy Rewrites)
FastAPI Backend API Gateway (Port 8000)
       │
       ├─► Auth (JWT & Role Verification Middleware)
       ├─► Scans Router (Saves uploads & triggers Grad-CAM)
       │       └─► PyTorch (ResNet-50 / Layer4 hook activations)
       │
       ├─► LangGraph Orchestrator (Multi-agent supervisor flow)
       │       ├─► Image Agent (Generates visual annotations)
       │       ├─► RAG Retrieval Agent (Scans WHO / PubMed indices)
       │       ├─► Report Agent (Bifurcates Clinician vs Patient text)
       │       └─► Verification Agent (Injects medical limitations sign-off)
       │
       └─► Databases
               ├─► PostgreSQL (User profiles, scans, audits) [Fallback to SQLite]
               └─► RAG Index (FAISS/TF-IDF)
```

---

## Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose (optional, for containerized run)

### Running via Docker Compose (Recommended)
1. Set up your environment file:
   ```bash
   cp .env.example .env
   ```
2. Build and launch all containers:
   ```bash
   docker-compose up --build
   ```
3. Access the interfaces:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend Swagger API docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Standalone Local Execution

#### 1. Backend Service
1. Navigate to the project root and install python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Configure `.env` values (a default `cdss_fallback.db` SQLite database will be initialized automatically if no PostgreSQL server is detected).
3. Start the uvicorn API worker:
   ```bash
   python app.py
   ```

#### 2. Frontend Application
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Clinical Demo Fast-Track Access

To facilitate clinical review, the platform initializes default staff profiles on startup. On the login screen, click any of the **Fast Track Demo Profiles** to sign in instantly with simulated roles:
- **Doctor Staff**: username `doctor`, password `DoctorPassword123`
- **Radiology Tech**: username `radiologist`, password `RadiologistPassword123`
- **Patient Portal**: username `patient`, password `PatientPassword123`
- **Admin Security**: username `admin`, password `AdminPassword123`

---

## Running Verification Tests

Run the test suite using pytest:
```bash
pytest backend/tests/test_main.py
```
This tests core endpoint routing, TF-IDF guidelines retrieval similarity, and explainable Grad-CAM activation outputs.
