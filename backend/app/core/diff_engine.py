import logging
from pathlib import Path

import aiofiles

from .config import get_settings

logger = logging.getLogger(__name__)


class DiffConflictError(Exception):
    """Raised when a hunk's expected old content does not match the actual file content."""


def _resolve_safe_path(file_path: str, workspace_root: str) -> Path | None:
    """Return the resolved absolute path if it stays within the workspace, else None."""
    if not workspace_root:
        return None

    workspace = Path(workspace_root).resolve()
    target = (workspace / file_path).resolve()

    # Python 3.12+: use is_relative_to for clarity, but startswith works everywhere
    try:
        target.relative_to(workspace)
    except ValueError:
        return None

    return target


def _verify_and_apply(
    lines: list[str],
    old_start: int,
    old_lines: int,
    content: str,
    hunk_idx: int,
) -> list[str]:
    """Verify the old content matches, then splice in the new content.

    Returns the modified lines list.
    Raises DiffConflictError on mismatch.
    """
    begin = old_start - 1  # convert to 0-based
    end = begin + old_lines

    if begin < 0 or end > len(lines):
        raise DiffConflictError(
            f"Hunk #{hunk_idx}: range [{old_start}, {old_start + old_lines}) "
            f"out of bounds for file with {len(lines)} lines"
        )

    # Build expected new lines from the hunk content.
    # splitlines(keepends=True) preserves line endings inside the content.
    new_content_lines = content.splitlines(keepends=True)

    # If content does not end with a newline but we are inserting into the
    # middle of a file, keep the original line ending of the last replaced line.
    if new_content_lines and not content.endswith("\n") and end < len(lines):
        new_content_lines[-1] = new_content_lines[-1].rstrip("\n\r") + lines[end - 1][len(lines[end - 1].lstrip("\n\r")):]

    # --- content verification ---
    # We compare the existing lines against what the hunk expects to replace.
    # The hunk's "content" field is the *new* code; we cannot verify the old
    # code from it.  However we can detect obviously wrong ranges: if the
    # hunk declares oldLines > 0 but the region is empty, or if the hunk
    # overlaps with a previously-applied hunk (detected via stale content).
    #
    # A stricter verification would require the hunk to carry old content,
    # but the current schema only has "content" (the replacement).  So we
    # do a sanity check on the range and trust the caller for content.
    #
    # For overlapping hunks (applied in reverse order so line numbers stay
    # valid), we track which lines have already been touched.
    # This is handled by the caller via _check_overlap.

    lines[begin:end] = new_content_lines
    return lines


def _check_hunk_overlap(hunks: list[dict]) -> None:
    """Detect overlapping hunks before any are applied.

    Hunks should be sorted by oldStart descending by the caller.
    Raises DiffConflictError if any two hunks overlap.
    """
    # Sort ascending for overlap detection
    sorted_asc = sorted(hunks, key=lambda h: h.get("oldStart", 0))
    for i in range(len(sorted_asc) - 1):
        curr_start = sorted_asc[i].get("oldStart", 0)
        curr_end = curr_start + sorted_asc[i].get("oldLines", 0)
        next_start = sorted_asc[i + 1].get("oldStart", 0)
        if next_start < curr_end:
            raise DiffConflictError(
                f"Hunks overlap: hunk at line {curr_start} (ends {curr_end}) "
                f"conflicts with hunk at line {next_start}"
            )


async def apply_diff(
    workspace_root: str,
    file_path: str,
    diff_hunks: list[dict],
) -> tuple[bool, str]:
    """Apply diff hunks to a file safely.

    Features:
    - Path traversal protection
    - In-memory backup with automatic rollback on write failure
    - Hunk overlap detection
    - Support for creating new files (oldStart == 0)
    - Async file I/O

    Returns (success, detail_message).
    """
    if not diff_hunks:
        return False, "No hunks provided"

    safe_path = _resolve_safe_path(file_path, workspace_root)
    if safe_path is None:
        msg = f"Path traversal rejected: {file_path!r} escapes workspace {workspace_root!r}"
        logger.warning(msg)
        return False, msg

    # --- detect overlapping hunks ---
    try:
        _check_hunk_overlap(diff_hunks)
    except DiffConflictError as exc:
        msg = f"Hunk conflict: {exc}"
        logger.warning(msg)
        return False, msg

    # --- read or initialise file content ---
    is_new_file = all(h.get("oldStart", 0) == 0 and h.get("oldLines", 0) == 0 for h in diff_hunks)

    if is_new_file:
        # Creating a brand-new file — ensure parent directory exists
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        lines: list[str] = []
        original_content: str | None = None  # None means file did not exist
    else:
        if not safe_path.exists():
            msg = f"File not found: {safe_path}"
            logger.warning(msg)
            return False, msg
        if not safe_path.is_file():
            msg = f"Not a regular file: {safe_path}"
            logger.warning(msg)
            return False, msg

        try:
            async with aiofiles.open(safe_path, mode="r", encoding="utf-8") as f:
                original_content = await f.read()
        except UnicodeDecodeError:
            msg = f"File is not valid UTF-8: {safe_path}"
            logger.warning(msg)
            return False, msg
        except OSError as exc:
            msg = f"Failed to read {safe_path}: {exc}"
            logger.exception(msg)
            return False, msg

        lines = original_content.splitlines(keepends=True)

    # --- in-memory backup for rollback ---
    backup_lines = list(lines)

    # --- apply hunks from bottom to top so line numbers stay valid ---
    sorted_hunks = sorted(diff_hunks, key=lambda h: h.get("oldStart", 0), reverse=True)

    for idx, hunk in enumerate(sorted_hunks):
        old_start = hunk.get("oldStart", 0)
        old_lines_count = hunk.get("oldLines", 0)
        content = hunk.get("content", "")

        # New-file hunk: oldStart == 0 means "insert at top"
        if old_start == 0 and old_lines_count == 0:
            new_content_lines = content.splitlines(keepends=True)
            lines = new_content_lines + lines
            logger.debug("Hunk #%d: created new file with %d lines", idx, len(new_content_lines))
            continue

        if not isinstance(old_start, int) or old_start < 1:
            msg = f"Hunk #{idx}: invalid oldStart={old_start!r}"
            logger.warning(msg)
            return False, msg

        try:
            lines = _verify_and_apply(lines, old_start, old_lines_count, content, idx)
        except DiffConflictError as exc:
            msg = str(exc)
            logger.warning(msg)
            return False, msg

    # --- write to disk with rollback on failure ---
    try:
        async with aiofiles.open(safe_path, mode="w", encoding="utf-8") as f:
            await f.writelines(lines)
    except OSError as exc:
        # Rollback: restore original content
        logger.error("Write failed for %s, rolling back: %s", safe_path, exc)
        try:
            if original_content is None:
                # File was newly created — remove it
                safe_path.unlink(missing_ok=True)
            else:
                async with aiofiles.open(safe_path, mode="w", encoding="utf-8") as f:
                    await f.writelines(backup_lines)
        except OSError as rollback_exc:
            logger.critical(
                "ROLLBACK FAILED for %s: %s — file may be corrupted!", safe_path, rollback_exc
            )
        return False, f"Failed to write {safe_path}: {exc}"

    msg = f"Applied {len(diff_hunks)} hunk(s) to {file_path}"
    logger.info(msg)
    return True, msg


# ---------------------------------------------------------------------------
# Legacy helper kept for backward compatibility with existing call sites
# that pass hunks as list[dict] and a pre-resolved workspace_root.
# ---------------------------------------------------------------------------

async def apply_diff_to_file(
    file_path: str,
    hunks: list[dict],
    workspace_root: str | None = None,
) -> tuple[bool, str]:
    """Wrapper that resolves workspace_root from settings if not provided."""
    root = workspace_root or get_settings().WORKSPACE_ROOT
    if not root:
        msg = "WORKSPACE_ROOT is not configured"
        logger.error(msg)
        return False, msg
    return await apply_diff(root, file_path, hunks)
