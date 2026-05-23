from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
import time

router = APIRouter()

class RegisterRequest(BaseModel):
    machine_hash: str
    user_id: str
    label: str

class VerifyRequest(BaseModel):
    machine_hash: str
    user_id: str

MACHINES_DB = {}
USERS_DB = {}

def get_user_tier(user_id: str):
    return USERS_DB.get(user_id, {}).get("tier", "free")

def count_user_machines(user_id: str):
    return sum(1 for m in MACHINES_DB.values() if m["user_id"] == user_id and not m.get("is_revoked", False))

@router.post("/register")
async def register_machine(req: RegisterRequest):
    if len(req.machine_hash) != 64 or not all(c in "0123456789abcdef" for c in req.machine_hash):
        raise HTTPException(status_code=400, detail="Invalid machine hash — must be 64 hex chars")
    
    tier = get_user_tier(req.user_id)
    if tier == "free" and count_user_machines(req.user_id) >= 2:
        raise HTTPException(status_code=403, detail={"error": "machine_limit_reached", "upgrade_url": "/billing/checkout"})
    
    key = f"{req.user_id}:{req.machine_hash}"
    if key in MACHINES_DB:
        MACHINES_DB[key]["last_seen"] = time.time()
        return {"machine_id": MACHINES_DB[key]["id"], "registered": False}
    
    machine_id = hashlib.sha256(key.encode()).hexdigest()[:16]
    MACHINES_DB[key] = {
        "id": machine_id,
        "user_id": req.user_id,
        "machine_hash": req.machine_hash,
        "label": req.label,
        "registered_at": time.time(),
        "last_seen": time.time(),
        "is_revoked": False,
    }
    
    return {"machine_id": machine_id, "registered": True}

@router.post("/verify")
async def verify_machine(req: VerifyRequest):
    key = f"{req.user_id}:{req.machine_hash}"
    if key not in MACHINES_DB or MACHINES_DB[key].get("is_revoked"):
        return {"authorized": False, "machine_id": None}
    
    MACHINES_DB[key]["last_seen"] = time.time()
    return {"authorized": True, "machine_id": MACHINES_DB[key]["id"]}
