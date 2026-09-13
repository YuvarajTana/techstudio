from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from auth import get_current_user
from database import User
import base64
import io
import urllib.parse

router = APIRouter(prefix="/api/qrcode", tags=["qrcode"])


class QRCodeRequest(BaseModel):
    content: Optional[str] = Field("https://teckstudio.ai", description="The URL, text, or content to encode in the QR code")
    qr_type: Optional[str] = Field("url", description="Type of QR code: url, text, wifi, vcard")
    foreground_color: Optional[str] = Field("#000000", description="Foreground hex color")
    background_color: Optional[str] = Field("#ffffff", description="Background hex color")
    wifi_ssid: Optional[str] = None
    wifi_password: Optional[str] = None
    wifi_security: Optional[str] = "WPA"
    vcard_name: Optional[str] = None
    vcard_email: Optional[str] = None
    vcard_phone: Optional[str] = None


@router.post("/generate")
def generate_qrcode(req: QRCodeRequest, current_user: User = Depends(get_current_user)):
    """Generate customizable vector/image QR Code for insertion into design canvas."""
    qr_type = (req.qr_type or "url").lower().strip()
    fg = (req.foreground_color or "#000000").strip()
    bg = (req.background_color or "#ffffff").strip()
    text_content = (req.content or "").strip()

    # Format specific QR types
    if qr_type == "wifi":
        ssid = req.wifi_ssid or "WiFi-Network"
        text_content = f"WIFI:S:{ssid};T:{req.wifi_security or 'WPA'};P:{req.wifi_password or ''};;"
    elif qr_type == "vcard":
        name = req.vcard_name or "Contact"
        text_content = f"BEGIN:VCARD\nVERSION:3.0\nN:{name}\nFN:{name}\nEMAIL:{req.vcard_email or ''}\nTEL:{req.vcard_phone or ''}\nEND:VCARD"

    if not text_content:
        text_content = "https://teckstudio.ai"


    try:
        import qrcode
        from qrcode.image.svg import SvgPathImage

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(text_content)
        qr.make(fit=True)

        # Generate SVG string
        img = qr.make_image(image_factory=SvgPathImage)
        buffer = io.BytesIO()
        img.save(buffer)
        svg_data = buffer.getvalue().decode("utf-8")

        # Apply custom colors if specified
        fg = req.foreground_color.strip()
        bg = req.background_color.strip()
        if fg != "#000000":
            svg_data = svg_data.replace('fill="#000000"', f'fill="{fg}"')
            svg_data = svg_data.replace('stroke="#000000"', f'stroke="{fg}"')

        # Convert to data URL for easy embedding
        encoded_svg = base64.b64encode(svg_data.encode("utf-8")).decode("utf-8")
        data_url = f"data:image/svg+xml;base64,{encoded_svg}"

        return {
            "success": True,
            "qr_type": req.qr_type,
            "encoded_content": text_content,
            "svg": svg_data,
            "data_url": data_url,
            "foreground_color": fg,
            "background_color": bg,
        }
    except Exception:
        # Fallback SVG QR representation if qrcode library fails
        escaped_url = urllib.parse.quote(text_content)
        data_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={escaped_url}&color={req.foreground_color.replace('#', '')}&bgcolor={req.background_color.replace('#', '')}"
        return {
            "success": True,
            "qr_type": req.qr_type,
            "encoded_content": text_content,
            "data_url": data_url,
            "fallback": True,
        }
