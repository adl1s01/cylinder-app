"""Page routes: serve the SPA entry point and PWA manifest."""

import os
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()

# routes/pages.py → routes/ → app/ → backend/
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE_DIR = os.getenv("APP_ROOT", _BACKEND_DIR)

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "frontend", "templates"))


@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/manifest.json")
async def manifest():
    return FileResponse(os.path.join(BASE_DIR, "frontend", "static", "manifest.json"))


@router.get("/sw.js")
async def service_worker():
    return FileResponse(os.path.join(BASE_DIR, "frontend", "static", "sw.js"))
