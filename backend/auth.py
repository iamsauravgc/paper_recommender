from fastapi import HTTPException, Request
from firebase_config import verify_firebase_token, PROJECT_ID

def verify_token(request: Request):
    if not PROJECT_ID:
        return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    user = verify_firebase_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return user

def require_user(request: Request):
    user = verify_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user
