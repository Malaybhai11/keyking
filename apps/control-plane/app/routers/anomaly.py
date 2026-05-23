from fastapi import APIRouter

router = APIRouter()

@router.get("/{user_id}")
async def get_anomalies(user_id: str):
    return {"user_id": user_id, "anomalies": []}

@router.patch("/{id}/resolve")
async def resolve_anomaly(id: str):
    return {"status": "resolved"}
