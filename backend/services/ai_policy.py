"""One policy boundary for the legacy cloud AI endpoints."""

from fastapi import HTTPException, Request


def local_only():
    return True


def legacy_ai_policy(request: Request):
    if local_only() and request.method == "POST":
        require_cloud()


def require_cloud():
    if local_only():
        raise HTTPException(
            503,
            {
                "code": "LOCAL_AI_REQUIRED",
                "message": "Local AI mode is enabled. Use Creative Studio local generation or manual authoring.",
                "retryable": False,
            },
        )
