import os
import sys
from pathlib import Path
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
PROJECT_NUMBER = os.getenv("FIREBASE_PROJECT_NUMBER", "")
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
    except jwt.PyJWTError as e:
        print(f"Firebase: failed to fetch signing key: {e}", file=sys.stderr)
        return None

    possible_audiences = [PROJECT_ID]
    if PROJECT_NUMBER:
        possible_audiences.append(PROJECT_NUMBER)

    last_error = None
    for aud in possible_audiences:
        try:
            decoded = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=aud,
                issuer=f"https://securetoken.google.com/{PROJECT_ID}",
            )
            return {
                "uid": decoded["sub"],
                "email": decoded.get("email", ""),
                "name": decoded.get("name", ""),
            }
        except jwt.PyJWTError as e:
            last_error = e
            continue

    print(f"Firebase: token verification failed with all audiences ({possible_audiences}): {last_error}", file=sys.stderr)
    return None
