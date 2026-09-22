"""Token-fenced shared lease; callers commit the containing transaction."""

import secrets
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from database import LocalResourceLease
from config import settings

RESOURCE_KEY = "heavy-compute"


def _row(db, key):
    if key != RESOURCE_KEY:
        raise HTTPException(422, "Unknown local resource.")
    return (
        db.query(LocalResourceLease)
        .filter_by(lease_key=key)
        .with_for_update()
        .populate_existing()
        .first()
    )


def acquire(db, owner, key=RESOURCE_KEY):
    row = _row(db, key)
    if row is None:
        try:
            with db.begin_nested():
                db.add(LocalResourceLease(lease_key=key))
                db.flush()
        except IntegrityError:
            pass
        row = _row(db, key)
    now = datetime.utcnow()
    if row.expires_at and row.expires_at > now:
        raise HTTPException(
            409, "Local inference or rendering is already using this resource."
        )
    row.owner, row.token = owner, secrets.token_hex(24)
    row.expires_at = now + timedelta(seconds=settings.LOCAL_GENERATION_LEASE_SECONDS)
    row.updated_at = now
    return {"token": row.token, "expires_at": row.expires_at.isoformat() + "Z"}


def held(db, owner, token, key=RESOURCE_KEY):
    row = _row(db, key)
    if (
        not row
        or row.owner != owner
        or not secrets.compare_digest(row.token or "", token)
        or not row.expires_at
        or row.expires_at <= datetime.utcnow()
    ):
        raise HTTPException(409, "Local resource lease is no longer active.")
    return row


def renew(db, owner, token, key=RESOURCE_KEY):
    row = held(db, owner, token, key)
    row.expires_at = datetime.utcnow() + timedelta(
        seconds=settings.LOCAL_GENERATION_LEASE_SECONDS
    )
    row.updated_at = datetime.utcnow()
    return {"token": row.token, "expires_at": row.expires_at.isoformat() + "Z"}


def release(db, owner, token, key=RESOURCE_KEY):
    row = held(db, owner, token, key)
    row.owner = row.token = row.expires_at = None
    row.updated_at = datetime.utcnow()
