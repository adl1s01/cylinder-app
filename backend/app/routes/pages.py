"""Page routes: serve the SPA entry point and PWA manifest."""

import os
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, FileResponse

router = APIRouter()

# routes/pages.py -> routes/ -> app/ -> backend/
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE_DIR = os.getenv("APP_ROOT", _BACKEND_DIR)

def _read_static(filename: str) -> str:
    path = os.path.join(BASE_DIR, "frontend", "templates", filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return HTMLResponse(_read_static("index.html"))

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return HTMLResponse(_read_static("index.html"))

@router.get("/manifest.json")
async def manifest():
    return FileResponse(os.path.join(BASE_DIR, "frontend", "static", "manifest.json"))

@router.get("/sw.js")
async def service_worker():
    return FileResponse(os.path.join(BASE_DIR, "frontend", "static", "sw.js"))
