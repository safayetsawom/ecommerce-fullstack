import time
import cloudinary
import cloudinary.utils
from fastapi import APIRouter, Depends

from app.config import settings
from app.models.user import User
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("/signature")
def get_upload_signature(admin: User = Depends(get_current_admin)):
    """
    Return a short-lived signature that the frontend uses to upload an image
    directly to Cloudinary. Only admins can obtain this.
    """
    timestamp = int(time.time())

    params_to_sign = {
        "timestamp": timestamp,
        "folder": "products",
    }

    signature = cloudinary.utils.api_sign_request(
        params_to_sign, settings.CLOUDINARY_API_SECRET
    )

    return {
        "signature": signature,
        "timestamp": timestamp,
        "api_key": settings.CLOUDINARY_API_KEY,
        "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
        "folder": "products",
    }