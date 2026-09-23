# CrediX Private Banking Backend API

The official FastAPI backend service for the **CrediX** intelligent financing and credit assessment platform.

---

## 🛠️ Tech Stack & Specifications

- **Framework**: Python 3.11+ & [FastAPI](https://fastapi.tiangolo.com/)
- **ORM & Database**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) with **SQLite** for development (`sqlite:///./credix.db`), configured with standard ORM models for instant migration to **PostgreSQL**.
- **Data Validation**: [Pydantic v2](https://docs.pydantic.dev/) with field camelCase/snake_case aliases matching frontend TypeScript schemas.
- **CORS Support**: Enabled out-of-the-box for `http://localhost:3000` (Next.js frontend).
- **AI Placeholders**: All AI-dependent fields (OCR accuracy, extracted data fields, credit scoring factors, fraud risk signals, RAG chat citations) are modeled with structured database columns and sensible default placeholders.

---

## 🚀 Getting Started

### 1. Create and Activate Virtual Environment

```bash
cd backend
python -m venv venv

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Key environment variables in `.env`:
- `DATABASE_URL`: `sqlite:///./credix.db` (or PostgreSQL connection string)
- `CORS_ORIGINS`: `["http://localhost:3000", "http://127.0.0.1:3000"]`
- `API_V1_STR`: `/api/v1`

### 4. Run the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

The server will automatically:
1. Initialize the SQLite database and create all tables.
2. Preload the exact seed data from `frontend/src/data/mockData.ts` on first startup.
3. Serve interactive OpenAPI Swagger documentation at: **[http://localhost:8000/docs](http://localhost:8000/docs)**.

### 5. Run Automated Tests

```bash
pytest
```

---

## 📋 Comprehensive API Endpoints Reference

All endpoints are prefixed with `/api/v1`.

### 1. Authentication & Users (`/auth`, `/users`)
*Inferred from `frontend/src/context/AuthContext.tsx` & `frontend/src/app/auth/login/page.tsx`*

| Method | Endpoint | Description | Why Needed by Frontend |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate or switch role (`officer` / `client`) | Powers role switching on Login screen and demo account links. |
| `GET` | `/api/v1/auth/me` | Retrieve active user profile | Provides current officer monogram/name for top header & dashboard banner. |
| `GET` | `/api/v1/users` | List registered users | User management and officer assignments. |
| `POST` | `/api/v1/users` | Register new user | Sign-up wizard on `/auth/login`. |

---

### 2. Loan Applications (`/applications`)
*Inferred from `frontend/src/app/applications/page.tsx`, `frontend/src/app/applications/[id]/page.tsx`, `frontend/src/app/apply/page.tsx`, & `frontend/src/app/portal/page.tsx`*

| Method | Endpoint | Description | Why Needed by Frontend |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/applications` | List applications with filters (`status`, `loanType`, `search`, pagination) | Populates applications data table and dashboard recent applications list. |
| `GET` | `/api/v1/applications/{id}` | Full application details (OCR, credit score, fraud signals, documents, timeline) | Drives the 5-tab detail view at `/applications/[id]`. |
| `POST` | `/api/v1/applications` | Submit new loan application | Receives 4-step wizard form submissions from `/apply`. |
| `PATCH` | `/api/v1/applications/{id}` | Update application fields | Edit applicant or loan parameters. |
| `POST` | `/api/v1/applications/{id}/decision` | Officer decision (`approve`, `reject`, `manual`) with audit notes | Sticky action bar at the bottom of the application detail page. |
| `DELETE` | `/api/v1/applications/{id}` | Delete application | Removes record from database. |

---

### 3. Document Management (`/documents`)
*Inferred from `frontend/src/app/documents/page.tsx` & `frontend/src/components/ui/FileUploader.tsx`*

| Method | Endpoint | Description | Why Needed by Frontend |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents` | List uploaded documents (optionally filtered by `applicationId`) | Renders document list in Document Analysis screen and client portal. |
| `GET` | `/api/v1/documents/{id}` | Retrieve document details & OCR bounding box metadata | Document preview modal. |
| `POST` | `/api/v1/documents` | Register/upload document metadata | Handles file dropzone uploads. |
| `DELETE` | `/api/v1/documents/{id}` | Remove document | Document removal action. |

---

### 4. Fraud Risk Monitoring (`/fraud`)
*Inferred from `frontend/src/app/fraud-detection/page.tsx` & `mockApplications[].fraudSignals`*

| Method | Endpoint | Description | Why Needed by Frontend |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/fraud/cases` | List applications flagged with fraud/anomalies | Populates card grid on `/fraud-detection` screen. |
| `GET` | `/api/v1/fraud/signals` | List detected anomaly signals (optionally filtered by `applicationId`) | Drives the explainable fraud signals list in the Fraud Detection tab. |

---

### 5. Case Management Kanban (`/cases`)
*Inferred from `frontend/src/app/case-management/page.tsx`*

| Method | Endpoint | Description | Why Needed by Frontend |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cases` | List all Kanban cards (filterable by `columnId`) | Renders the 3-column Kanban board (`processing`, `human_review`, `completed`). |
| `POST` | `/api/v1/cases` | Create new case card | "Create Case" modal form on `/case-management`. |
| `PATCH` | `/api/v1/cases/{id}` | Move case card across columns or update stage tag | Drag/click actions moving cards between Kanban stages. |
| `DELETE` | `/api/v1/cases/{id}` | Delete case card | Removes card from board. |

---

### 6. AI Copilot Assistant (`/ai-assistant`)
*Inferred from `frontend/src/app/ai-assistant/page.tsx`*

| Method | Endpoint | Description | Why Needed by Frontend |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ai-assistant/sessions` | List past and active chat sessions | Populates left sidebar chat history. |
| `POST` | `/api/v1/ai-assistant/sessions` | Create new chat session | "+ New Chat" button. |
| `GET` | `/api/v1/ai-assistant/sessions/{id}` | Get session details and full message thread | Loads chat history when switching sessions. |
| `GET` | `/api/v1/ai-assistant/sessions/{id}/messages` | List messages in a session | Message stream feed. |
| `POST` | `/api/v1/ai-assistant/sessions/{id}/messages` | Send prompt & receive simulated RAG answer with document citations | Handles chat input, quick prompt chips, and citation badges. |
| `DELETE` | `/api/v1/ai-assistant/sessions/{id}` | Delete chat session | Removes session from history. |

---

### 7. Executive Dashboard & Metrics (`/dashboard`)
*Inferred from `frontend/src/app/dashboard/page.tsx`*

| Method | Endpoint | Description | Why Needed by Frontend |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/stats` | KPI cards (total applications, approval rate, under review, fraud alerts) | Top 4 executive KPI summary cards on the main dashboard. |
| `GET` | `/api/v1/dashboard/trends` | 30-day incoming application volume points | 30-day Area chart gradient. |
| `GET` | `/api/v1/dashboard/status-distribution` | Application status breakdown percentages | Status Donut chart. |
| `GET` | `/api/v1/dashboard/loan-types` | Volume breakdown by financing category | Loan type Bar chart. |

---

## 📂 Backend Directory Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app instance, CORS, lifespan database seeder
│   ├── config.py                # Environment settings via Pydantic BaseSettings
│   ├── database.py              # SQLAlchemy engine, session maker, declarative base
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py              # User
│   │   ├── application.py       # LoanApplication, Document, TimelineEvent
│   │   ├── case.py              # CaseCard (Kanban)
│   │   └── chat.py              # ChatSession, ChatMessage
│   ├── schemas/                 # Pydantic validation schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── application.py
│   │   ├── document.py
│   │   ├── timeline.py
│   │   ├── fraud.py
│   │   ├── case.py
│   │   ├── chat.py
│   │   └── dashboard.py
│   ├── crud/                    # Database query and persistence methods
│   │   ├── __init__.py
│   │   ├── crud_user.py
│   │   ├── crud_application.py
│   │   ├── crud_case.py
│   │   ├── crud_chat.py
│   │   └── crud_document.py
│   ├── api/                     # Route controllers
│   │   ├── __init__.py
│   │   ├── api.py               # Aggregated v1 API router
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── applications.py
│   │       ├── documents.py
│   │       ├── fraud.py
│   │       ├── cases.py
│   │       ├── chat.py
│   │       └── dashboard.py
│   └── seed/                    # Database seeder preloading frontend mock data
│       ├── __init__.py
│       └── seed_data.py
├── tests/                       # Automated pytest test suite
│   ├── __init__.py
│   └── test_api.py
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

