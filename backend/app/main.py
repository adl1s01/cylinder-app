"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import init_db, SessionLocal
from app.models import Cylinder, CylinderStatus, Inspection, User, NotificationSettings
from app.routes import auth_router, api_router, pages_router
from app.routes.auth_routes import seed_admin

# Works both locally (cylinder-app/backend/app/main.py) and on Render
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR_LOCAL = os.getenv("APP_ROOT", _BACKEND_DIR)


def check_upcoming_inspections():
    import requests
    from datetime import date, timedelta

    db = SessionLocal()
    try:
        today = date.today()
        check_dates = [
            (today + timedelta(days=7), "⚠️ 1 неделя"),
            (today + timedelta(days=30), "📅 1 месяц"),
            (today + timedelta(days=90), "📅 3 месяца"),
        ]

        # Collect unique users with Telegram settings
        settings_list = (
            db.query(NotificationSettings)
            .filter(
                NotificationSettings.telegram_bot_token.isnot(None),
                NotificationSettings.telegram_chat_id.isnot(None),
            )
            .all()
        )

        if not settings_list:
            return

        # Collect NotificationSettings to check per-user preferences
        all_ns = (
            db.query(NotificationSettings)
            .filter(
                NotificationSettings.telegram_bot_token.isnot(None),
                NotificationSettings.telegram_chat_id.isnot(None),
            )
            .all()
        )

        for check_date, label in check_dates:
            # Range check: any cylinder due between today and check_date
            cylinders = (
                db.query(Cylinder)
                .filter(
                    Cylinder.status.in_([CylinderStatus.ACTIVE, CylinderStatus.INSPECTION]),
                    Cylinder.next_inspection_date >= today,
                    Cylinder.next_inspection_date <= check_date,
                )
                .all()
            )
            if not cylinders:
                continue

            lines = [f"🔔 *Баллоны — освидетельствование через {label}*", ""]
            for cyl in cylinders:
                lines.append(
                    f"• Баллон №{cyl.number} (клеймо: {cyl.stamp or '—'}) — {cyl.next_inspection_date}"
                )

            message = "\n".join(lines)

            for ns in all_ns:
                try:
                    url = f"https://api.telegram.org/bot{ns.telegram_bot_token}/sendMessage"
                    requests.post(
                        url,
                        json={
                            "chat_id": ns.telegram_chat_id,
                            "text": message,
                            "parse_mode": "Markdown",
                        },
                        timeout=10,
                    )
                except Exception:
                    pass

        # ── Overdue check ──
        overdue = (
            db.query(Cylinder)
            .filter(
                Cylinder.status.in_([CylinderStatus.ACTIVE, CylinderStatus.INSPECTION]),
                Cylinder.next_inspection_date < today,
            )
            .all()
        )
        if overdue:
            lines = ["⚠️ *ПРОСРОЧЕННЫЕ БАЛЛОНЫ*", ""]
            for cyl in overdue:
                lines.append(
                    f"• Баллон №{cyl.number} (клеймо: {cyl.stamp or '—'}) — {cyl.next_inspection_date}"
                )
            message = "\n".join(lines)
            for ns in all_ns:
                try:
                    url = f"https://api.telegram.org/bot{ns.telegram_bot_token}/sendMessage"
                    requests.post(
                        url,
                        json={
                            "chat_id": ns.telegram_chat_id,
                            "text": message,
                            "parse_mode": "Markdown",
                        },
                        timeout=10,
                    )
                except Exception:
                    pass
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Seed default admin
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    # Scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_upcoming_inspections, CronTrigger(hour=9, minute=0))
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Учёт баллонов", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
uploads_dir = os.path.join(BASE_DIR_LOCAL, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR_LOCAL, "frontend", "static")), name="static")
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

templates = Jinja2Templates(directory=os.path.join(BASE_DIR_LOCAL, "frontend", "templates"))

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(api_router, prefix="/api", tags=["api"])
app.include_router(pages_router, tags=["pages"])
