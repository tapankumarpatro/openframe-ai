from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Create SQLite tables on import (before any route accesses the DB)
from api.services.database import create_tables
create_tables()

app = FastAPI(
    title="OpenFrame AI API",
    description="The Open Source Ad Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.routes.health import router as health_router
from api.routes.workflow import router as workflow_router
from api.routes.projects import router as projects_router
from api.routes.image_gen import router as image_gen_router
from api.routes.api_logs import router as logs_router
from api.routes.upload import router as upload_router
from api.routes.video_gen import router as video_gen_router
from api.routes.settings import router as settings_router
from api.routes.audio_gen import router as audio_gen_router
from api.routes.srt_gen import router as srt_router
from api.routes.auth import router as auth_router
from api.routes.license import router as license_router
from api.routes.batch_gen import router as batch_gen_router

app.include_router(health_router)
app.include_router(workflow_router)
app.include_router(projects_router)
app.include_router(image_gen_router)
app.include_router(logs_router)
app.include_router(upload_router)
app.include_router(video_gen_router)
app.include_router(settings_router)
app.include_router(audio_gen_router)
app.include_router(srt_router)
app.include_router(auth_router)
app.include_router(license_router)
app.include_router(batch_gen_router)


@app.on_event("startup")
async def _startup():
    import asyncio
    from api.services.license import validate_license, _periodic_revalidation
    await validate_license()
    asyncio.create_task(_periodic_revalidation())
