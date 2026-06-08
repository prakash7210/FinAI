import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from bson import ObjectId
from fastapi import Depends, Header, HTTPException, status

from DB.db import sessions_collection, users_collection

TOKEN_TTL_SECONDS = int(os.getenv("AUTH_TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 7)))
SECRET_KEY = os.getenv("AUTH_SECRET_KEY") or os.getenv("GROQ_API_KEY") or "dev-financial-ai-secret"
PBKDF2_ITERATIONS = 120_000


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${_b64_encode(salt)}${_b64_encode(digest)}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected = password_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False

        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _b64_decode(salt),
            int(iterations),
        )
        return hmac.compare_digest(_b64_encode(digest), expected)
    except Exception:
        return False


def create_token(user_id: ObjectId, user_agent: str = "Unknown device") -> str:
    issued_at = int(time.time())
    expires_at = issued_at + TOKEN_TTL_SECONDS
    jti = secrets.token_urlsafe(18)
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "iat": issued_at,
        "exp": expires_at,
    }
    encoded_header = _b64_encode(
        json.dumps(header, separators=(",", ":")).encode("utf-8")
    )
    encoded_payload = _b64_encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    signing_input = f"{encoded_header}.{encoded_payload}"
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()

    sessions_collection.insert_one({
        "jti": jti,
        "userId": user_id,
        "userAgent": user_agent[:220],
        "createdAt": issued_at,
        "expiresAt": expires_at,
        "active": True,
    })

    return f"{signing_input}.{_b64_encode(signature)}"


def decode_token(token: str) -> dict:
    try:
        encoded_header, encoded_payload, signature = token.split(".", 2)
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected = hmac.new(
            SECRET_KEY.encode("utf-8"),
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()

        if not hmac.compare_digest(_b64_encode(expected), signature):
            raise ValueError("Invalid signature")

        payload = json.loads(_b64_decode(encoded_payload))
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token expired")

        session = sessions_collection.find_one({
            "jti": payload.get("jti"),
            "userId": ObjectId(payload["sub"]),
            "active": True,
        })
        if not session:
            raise ValueError("Session revoked")

        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from exc


def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_token(authorization.split(" ", 1)[1].strip())
    user = users_collection.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def current_token_payload(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    return decode_token(authorization.split(" ", 1)[1].strip())


CurrentUser = Depends(current_user)
