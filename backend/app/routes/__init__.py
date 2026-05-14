"""Route modules package."""

from app.routes.auth_routes import router as auth_router
from app.routes.api_routes import router as api_router
from app.routes.pages import router as pages_router

__all__ = ["auth_router", "api_router", "pages_router"]
