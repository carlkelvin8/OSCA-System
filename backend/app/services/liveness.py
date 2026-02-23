"""
Liveness Detection using Silent-Face-Anti-Spoofing (MiniFASNet).
Detects printed photos and screen-displayed faces.

Installation:
  pip install git+https://github.com/minivision-ai/Silent-Face-Anti-Spoofing.git

The model is a lightweight MobileNet variant (MiniFASNet) that classifies
a face crop as 'real' or 'spoof' with a confidence score.
"""
import numpy as np
import structlog

logger = structlog.get_logger(__name__)


class LivenessDetector:
    """
    Wraps MiniFASNet for liveness detection.
    Score > threshold → real face
    Score < threshold → spoof (photo/screen)
    """

    def __init__(self) -> None:
        self._model = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            # Import from Silent-Face-Anti-Spoofing package
            # This package must be installed from GitHub source
            from src.anti_spoof_predict import AntiSpoofPredict
            from src.generate_patches import CropImage
            import os

            model_dir = os.path.join(
                os.path.dirname(__file__), "models", "anti_spoof"
            )
            self._model = AntiSpoofPredict(device_id=0)
            self._crop_image = CropImage()
            logger.info("liveness_model_loaded")
        except ImportError:
            logger.warning(
                "liveness_model_not_found",
                note="Install: pip install git+https://github.com/minivision-ai/Silent-Face-Anti-Spoofing",
            )

    def predict(self, img_rgb: np.ndarray) -> float:
        """
        Returns liveness score between 0.0 (spoof) and 1.0 (real).
        Falls back to 1.0 (permissive) if model not available.
        """
        if self._model is None:
            logger.warning("liveness_fallback", note="Liveness model not loaded — skipping check")
            return 1.0

        try:
            import cv2
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            h, w = img_bgr.shape[:2]

            # MiniFASNet expects specific input sizes
            prediction = np.zeros((1, 3))
            for model_test in [("2.7_80x80_MiniFASNetV2.pth", (80, 80)),
                                ("4_0_0_80x80_MiniFASNetV1SE.pth", (80, 80))]:
                param = {"org_img": img_bgr, "bbox": [0, 0, w, h], "scale": 2.7,
                         "out_w": 80, "out_h": 80, "crop": True}
                img_crop = self._crop_image.crop(**param)
                prediction += self._model.predict(img_crop, model_test[0])

            label = np.argmax(prediction)
            score = prediction[0][1] / prediction.sum()  # Real class probability
            return float(score)

        except Exception as e:
            logger.warning("liveness_predict_error", error=str(e))
            return 1.0  # Fail open — log but don't block
