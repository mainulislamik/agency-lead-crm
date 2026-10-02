from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.endpoints import router as api_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Picasa & Stencil B2B Lead Engine & CRM API",
    version="1.0.0",
    description="Automated Lead Scraping, Email/Phone Verification, and Telemarketing CRM"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Picasa & Stencil B2B Lead CRM Engine",
        "version": "1.0.0"
    }
