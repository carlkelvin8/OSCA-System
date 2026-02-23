"""
MinIO (S3-compatible) storage service.
Stores: face enrollment images, barcode images, QR code images, generated reports.
R.A. 10173 compliance: face images in private bucket, no public access.
"""
import io
from typing import Any

import boto3
import structlog
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import settings

logger = structlog.get_logger(__name__)


class StorageService:
    """Thin async-friendly wrapper around boto3 S3 client for MinIO."""

    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
            region_name="us-east-1",  # Required but ignored by MinIO
        )

    def _ensure_bucket(self, bucket: str) -> None:
        """Create bucket if it doesn't exist (idempotent)."""
        try:
            self._client.head_bucket(Bucket=bucket)
        except ClientError:
            self._client.create_bucket(Bucket=bucket)
            # Block all public access (biometric data — R.A. 10173)
            self._client.put_public_access_block(
                Bucket=bucket,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": True,
                    "IgnorePublicAcls": True,
                    "BlockPublicPolicy": True,
                    "RestrictPublicBuckets": True,
                },
            )
            logger.info("bucket_created", bucket=bucket)

    async def upload_bytes(
        self,
        bucket: str,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload bytes to MinIO. Returns the object key."""
        self._ensure_bucket(bucket)
        self._client.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        logger.debug("storage_upload", bucket=bucket, key=key, size_bytes=len(data))
        return key

    async def upload_barcode_image(self, barcode_value: str, png_bytes: bytes) -> str:
        """Upload a Code-128 barcode PNG to MinIO."""
        key = f"barcodes/{barcode_value}.png"
        return await self.upload_bytes(
            bucket=settings.MINIO_BUCKET_REPORTS,
            key=key,
            data=png_bytes,
            content_type="image/png",
        )

    async def upload_qr_image(self, qr_value: str, png_bytes: bytes) -> str:
        """Upload a QR Code PNG to MinIO."""
        key = f"qrcodes/{qr_value}.png"
        return await self.upload_bytes(
            bucket=settings.MINIO_BUCKET_REPORTS,
            key=key,
            data=png_bytes,
            content_type="image/png",
        )

    async def upload_report(self, filename: str, data: bytes, content_type: str) -> str:
        """Upload a generated report (PDF/XLSX) to MinIO."""
        key = f"reports/{filename}"
        return await self.upload_bytes(
            bucket=settings.MINIO_BUCKET_REPORTS,
            key=key,
            data=data,
            content_type=content_type,
        )

    def get_presigned_url(self, bucket: str, key: str, expires_in: int = 3600) -> str:
        """Generate a pre-signed URL for temporary object access."""
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    async def delete_object(self, bucket: str, key: str) -> None:
        """Delete an object (e.g., purge face images after retention period)."""
        self._client.delete_object(Bucket=bucket, Key=key)
        logger.info("storage_deleted", bucket=bucket, key=key)

    async def delete_face_images(self, user_id: str, image_keys: list[str]) -> None:
        """
        Delete face enrollment images.
        Called by Celery task after FACE_IMAGE_RETENTION_DAYS (R.A. 10173).
        """
        for key in image_keys:
            await self.delete_object(settings.MINIO_BUCKET_FACES, key)
        logger.info("face_images_purged", user_id=user_id, count=len(image_keys))
