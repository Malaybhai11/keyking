from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import stripe
import os

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_")
PRICE_ID = "price_keyking_ultra"

class CheckoutRequest(BaseModel):
    user_id: str
    email: str

@router.post("/checkout")
async def checkout(req: CheckoutRequest):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": PRICE_ID, "quantity": 1}],
            mode="subscription",
            success_url="https://keyking.dev/success",
            cancel_url="https://keyking.dev/cancel",
            customer_email=req.email,
            metadata={"user_id": req.user_id},
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig, os.getenv("STRIPE_WEBHOOK_SECRET", ""))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "checkout.session.completed":
        # Update user tier to ultra
        pass
    
    return {"status": "ok"}

@router.get("/portal")
async def portal(user_id: str):
    return {"portal_url": "https://stripe.com/portal/mock"}
