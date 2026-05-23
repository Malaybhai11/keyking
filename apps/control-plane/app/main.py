from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import machines, quota, anomaly, billing
import os

app = FastAPI(title="Key King Control Plane", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(machines.router, prefix="/machines", tags=["machines"])
app.include_router(quota.router, prefix="/quota", tags=["quota"])
app.include_router(anomaly.router, prefix="/anomaly", tags=["anomaly"])
app.include_router(billing.router, prefix="/billing", tags=["billing"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
