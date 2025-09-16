# Project Setup for farmer-ai-human-feedback-system

This project uses uv (https://docs.astral.sh/uv/) to manage Python versions, virtual environments, and dependencies.

Supported Python: 3.11 (pinned in `.python-version`)

All commands below target Windows CMD (default shell).

Prerequisites

- Install uv (recommended installer or pip)

Install uv (recommended standalone installer)

    curl -LsSf https://astral.sh/uv/install.sh | sh

Or install via pip:

    pip install uv

Initialize uv project (if not already initialized)

    cd path\to\project
    uv init --name farmer-ai-human-feedback-system

If you already have `pyproject.toml`, uv will detect the project root.

Install or sync dependencies

To create the project virtual environment and install the locked dependencies (uses `pyproject.toml` and `uv.lock`):

    uv sync

To add a new dependency and update the lockfile:

    uv add <package>

Activating the virtual environment

uv creates a local `.venv` in the project root. Activate it in CMD:

    .venv\Scripts\activate

Run the application (uv-managed)

To run the Streamlit app without manually activating the virtual environment:

    uv run -- streamlit run app.py

With the environment activated in CMD:

    .venv\Scripts\activate
    streamlit run app.py

## Running the backend and frontend (development)

1. Backend (FastAPI)

From project root, create the uv virtual environment and sync dependencies with uv:

    uv sync

Run the FastAPI backend with uvicorn via uv:

    uv run -- uvicorn app:app --reload --port 8000

The backend will be available at `http://127.0.0.1:8000`

Analytics (EDA) service (optional)

This project includes a small analytics service (`eda_service.py`) that reads the same SQLite database and exposes a GET /insights endpoint used by the frontend Insights page. Run the analytics service from the project root so it can find the `data.db` file:

    uvicorn eda_service:app --reload --port 5175

Or run directly with Python:

    python eda_service.py

The analytics service defaults to port 5175 and honors the same `DATABASE_URL` environment variable as the main backend (default: `sqlite:///./data.db`). If you run the analytics service on a different host/port, set `VITE_EDA_URL` in the frontend `.env` to point to it, for example:

    VITE_EDA_URL=`http://localhost:5175`

2. Frontend (React + TypeScript with Vite)

Install frontend dependencies and start dev server:

    cd frontend
    npm install
    npm run dev

Vite dev server defaults to `http://localhost:5173` — the frontend is configured to talk to the backend at `http://localhost:8000`.

Environment variables

You can configure the runtime behavior with environment variables.

- `VITE_API_URL` (frontend .env) — API base URL used by the React app (default: `http://localhost:8000`).
- `ALLOW_ORIGINS` (backend) — comma-separated list of allowed CORS origins. Example:

    ALLOW_ORIGINS=`http://localhost:5173,http://127.0.0.1:5173`

- `DATABASE_URL` (backend) — SQLite URL or other SQLModel-compatible DSN. Default: `sqlite:///./data.db`.

Notes about persistence

This project persists conversations and expert answers to a SQLite database by default (`./data.db`). The backend creates the database and tables automatically on first run. For production, configure `DATABASE_URL` to point to a managed database and add proper migrations.

Run (summary)

1. Install Python dependencies and sync with uv (from project root):

    uv sync

2. Start backend:

    uv run -- uvicorn app:app --reload --port 8000

3. Start frontend (new terminal):

    cd frontend
    npm install
    npm run dev

Now open the Vite dev server (default `http://localhost:5173`).
