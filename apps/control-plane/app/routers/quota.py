from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class QuotaSync(BaseModel):
    machine_id: str
    provider: str
    remaining_requests: Optional[int]
    remaining_tokens: Optional[int]

@router.post("/sync")
async def sync_quota(req: QuotaSync):
    # Store in Supabase (mocked for now)
    return {"status": "synced"}

@router.get("/summary/{user_id}")
async def quota_summary(user_id: str):
    return {"user_id": user_id, "quotas": []}
