import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import FRONTEND_ORIGIN

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
app = FastAPI(title="RoadSense AI API", version="1.0.0",
              description="Multi-factor road accident risk mapping. Historical data only; "
                          "severity predictions are not accident-occurrence probabilities.")
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logging.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error. See server logs."})


@app.get("/")
def root():
    return {"service": "RoadSense AI", "docs": "/docs", "health": "/api/health"}
