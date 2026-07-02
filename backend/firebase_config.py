import os
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
_jwks_client = None
_jwks_url = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

def verify_firebase_token(token: str):
    if not PROJECT_ID:
        return None

    global _jwks_client
    if not _jwks_client:
        _jwks_client = PyJWKClient(_jwks_url, cache_keys=True)

    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=PROJECT_ID,
            issuer=f"https://securetoken.google.com/{PROJECT_ID}",
        )
        return {
            "uid": decoded["sub"],
            "email": decoded.get("email", ""),
            "name": decoded.get("name", ""),
        }
    except jwt.PyJWTError:
        return None
