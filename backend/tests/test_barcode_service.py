"""
Unit tests for BarcodeService.
Covers: Code-128 barcode generation/rendering and QR code generation/rendering.

All methods are static and have no I/O or DB dependencies, so these are pure
unit tests — no fixtures or mocking required.
"""
import re
import string
import uuid

import pytest

from app.services.barcode_service import BarcodeService

# PNG file signature — first 8 bytes of every valid PNG
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


# ── generate_code128_value ────────────────────────────────────────────────────


class TestGenerateCode128Value:
    def test_returns_string(self):
        result = BarcodeService.generate_code128_value()
        assert isinstance(result, str)

    def test_has_osca_prefix(self):
        result = BarcodeService.generate_code128_value()
        assert result.startswith("OSCA-"), f"Expected 'OSCA-' prefix, got: {result!r}"

    def test_total_length_is_13(self):
        # "OSCA-" (5) + 8 alphanumeric chars = 13
        result = BarcodeService.generate_code128_value()
        assert len(result) == 13, f"Expected length 13, got {len(result)}: {result!r}"

    def test_suffix_is_uppercase_alphanumeric(self):
        allowed = set(string.ascii_uppercase + string.digits)
        for _ in range(20):
            result = BarcodeService.generate_code128_value()
            suffix = result[5:]  # strip "OSCA-"
            assert len(suffix) == 8
            assert all(c in allowed for c in suffix), (
                f"Suffix contains invalid characters: {suffix!r}"
            )

    def test_format_matches_pattern(self):
        result = BarcodeService.generate_code128_value()
        assert re.fullmatch(r"OSCA-[A-Z0-9]{8}", result), (
            f"Value does not match expected pattern OSCA-[A-Z0-9]{{8}}: {result!r}"
        )

    def test_values_are_unique(self):
        """Repeated calls must not return the same value (uses secrets.choice)."""
        values = {BarcodeService.generate_code128_value() for _ in range(50)}
        # With 36^8 ≈ 2.8 trillion possibilities, collisions in 50 draws are
        # astronomically unlikely. Any collision indicates a broken generator.
        assert len(values) == 50, "Duplicate barcode values generated — randomness failure"


# ── render_code128 ────────────────────────────────────────────────────────────


class TestRenderCode128:
    def test_returns_bytes(self):
        value = BarcodeService.generate_code128_value()
        result = BarcodeService.render_code128(value)
        assert isinstance(result, bytes)

    def test_output_is_valid_png(self):
        value = BarcodeService.generate_code128_value()
        result = BarcodeService.render_code128(value)
        assert result[:8] == _PNG_MAGIC, "render_code128 did not produce a valid PNG"

    def test_output_is_non_empty(self):
        value = BarcodeService.generate_code128_value()
        result = BarcodeService.render_code128(value)
        assert len(result) > 0

    def test_default_dpi_produces_output(self):
        """Calling without explicit dpi (defaults to 300) must succeed."""
        result = BarcodeService.render_code128("OSCA-TESTVAL")
        assert result[:8] == _PNG_MAGIC

    def test_custom_dpi_produces_output(self):
        result = BarcodeService.render_code128("OSCA-TESTVAL", dpi=150)
        assert result[:8] == _PNG_MAGIC

    def test_high_dpi_produces_larger_image(self):
        """Higher DPI should produce a larger file (more pixels)."""
        value = "OSCA-ABCD1234"
        low = BarcodeService.render_code128(value, dpi=200)
        high = BarcodeService.render_code128(value, dpi=600)
        assert len(high) > len(low), (
            "600 DPI image should be larger than 200 DPI image"
        )

    def test_renders_real_generated_value(self):
        """End-to-end: generate then render without errors."""
        value = BarcodeService.generate_code128_value()
        result = BarcodeService.render_code128(value)
        assert result[:8] == _PNG_MAGIC


# ── generate_qr_value ─────────────────────────────────────────────────────────


class TestGenerateQrValue:
    def test_returns_string(self):
        result = BarcodeService.generate_qr_value(str(uuid.uuid4()))
        assert isinstance(result, str)

    def test_has_bid_prefix(self):
        instructor_id = str(uuid.uuid4())
        result = BarcodeService.generate_qr_value(instructor_id)
        assert result.startswith("BID-"), f"Expected 'BID-' prefix, got: {result!r}"

    def test_exact_format(self):
        instructor_id = str(uuid.uuid4())
        result = BarcodeService.generate_qr_value(instructor_id)
        assert result == f"BID-{instructor_id}", (
            f"Expected 'BID-{instructor_id}', got {result!r}"
        )

    def test_embeds_instructor_id(self):
        instructor_id = str(uuid.uuid4())
        result = BarcodeService.generate_qr_value(instructor_id)
        assert instructor_id in result

    def test_different_ids_produce_different_values(self):
        id1 = str(uuid.uuid4())
        id2 = str(uuid.uuid4())
        assert BarcodeService.generate_qr_value(id1) != BarcodeService.generate_qr_value(id2)

    def test_same_id_is_deterministic(self):
        """Same instructor_id must always produce the same QR value."""
        instructor_id = str(uuid.uuid4())
        assert (
            BarcodeService.generate_qr_value(instructor_id)
            == BarcodeService.generate_qr_value(instructor_id)
        )

    def test_format_matches_pattern(self):
        instructor_id = str(uuid.uuid4())
        result = BarcodeService.generate_qr_value(instructor_id)
        # UUID v4 pattern (lowercase, hyphens)
        assert re.fullmatch(
            r"BID-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}",
            result,
        ), f"Value does not match BID-<uuid4> pattern: {result!r}"


# ── render_qr ─────────────────────────────────────────────────────────────────


class TestRenderQr:
    def test_returns_bytes(self):
        value = BarcodeService.generate_qr_value(str(uuid.uuid4()))
        result = BarcodeService.render_qr(value)
        assert isinstance(result, bytes)

    def test_output_is_valid_png(self):
        value = BarcodeService.generate_qr_value(str(uuid.uuid4()))
        result = BarcodeService.render_qr(value)
        assert result[:8] == _PNG_MAGIC, "render_qr did not produce a valid PNG"

    def test_output_is_non_empty(self):
        value = BarcodeService.generate_qr_value(str(uuid.uuid4()))
        result = BarcodeService.render_qr(value)
        assert len(result) > 0

    def test_default_parameters_produce_output(self):
        """Calling with no optional arguments must succeed."""
        result = BarcodeService.render_qr("BID-some-value")
        assert result[:8] == _PNG_MAGIC

    def test_custom_box_size(self):
        value = BarcodeService.generate_qr_value(str(uuid.uuid4()))
        result = BarcodeService.render_qr(value, box_size=5)
        assert result[:8] == _PNG_MAGIC

    def test_custom_border(self):
        value = BarcodeService.generate_qr_value(str(uuid.uuid4()))
        result = BarcodeService.render_qr(value, border=2)
        assert result[:8] == _PNG_MAGIC

    def test_larger_box_size_produces_larger_image(self):
        """A larger box_size should increase the rendered image size."""
        value = BarcodeService.generate_qr_value(str(uuid.uuid4()))
        small = BarcodeService.render_qr(value, box_size=5)
        large = BarcodeService.render_qr(value, box_size=20)
        assert len(large) > len(small), (
            "box_size=20 image should be larger than box_size=5 image"
        )

    def test_renders_real_generated_value(self):
        """End-to-end: generate then render without errors."""
        instructor_id = str(uuid.uuid4())
        qr_value = BarcodeService.generate_qr_value(instructor_id)
        result = BarcodeService.render_qr(qr_value)
        assert result[:8] == _PNG_MAGIC

    def test_render_with_long_data(self):
        """Service must handle data longer than a single QR version supports."""
        long_value = "BID-" + "a" * 200
        result = BarcodeService.render_qr(long_value)
        assert result[:8] == _PNG_MAGIC
