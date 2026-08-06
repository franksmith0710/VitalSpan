"""FE/BE persistence contract: strict writes and style field roundtrip."""

import pytest
from pydantic import ValidationError

from app.dashboard.schemas import DashboardLayout, DashboardStyleConfig


def test_unknown_layout_widget_field_rejected() -> None:
    with pytest.raises(ValidationError):
        DashboardLayout.model_validate(
            {
                "version": 2,
                "canvas": {"width": 1440, "height": 900},
                "widgets": [
                    {
                        "id": "00000000-0000-4000-8000-000000000001",
                        "type": "text",
                        "title": "t",
                        "textConfig": {"content": "x", "variant": "plain"},
                        "unknownWidgetField": True,
                    }
                ],
            }
        )


def test_canvas_background_image_fit_and_position_roundtrip() -> None:
    payload = {
        "canvasBackgroundImageFit": "contain",
        "canvasBackgroundImagePosition": "center top",
        "themeVariants": {
            "light": {
                "canvasBackgroundImageFit": "cover",
                "canvasBackgroundImagePosition": "50% 50%",
            }
        },
    }
    cfg = DashboardStyleConfig.model_validate(payload)
    dumped = cfg.model_dump(by_alias=True, exclude_none=True)
    assert dumped["canvasBackgroundImageFit"] == "contain"
    assert dumped["canvasBackgroundImagePosition"] == "center top"
    assert dumped["themeVariants"]["light"]["canvasBackgroundImageFit"] == "cover"
    assert dumped["themeVariants"]["light"]["canvasBackgroundImagePosition"] == "50% 50%"
