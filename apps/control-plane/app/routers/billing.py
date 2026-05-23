from fastapi import APIRouter

router = APIRouter()

@router.post("/checkout")
async def checkout():
    return {"checkout_url": "https://stripe.com/checkout/mock"}

@router.post("/webhook")
async def webhook():
    return {"status": "received"}

@router.get("/portal")
async def portal():
    return {"portal_url": "https://stripe.com/portal/mock"}
