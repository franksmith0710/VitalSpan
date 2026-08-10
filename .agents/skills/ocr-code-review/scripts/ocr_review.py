#!/usr/bin/env python3
"""Deterministic state and output guard for the ocr-code-review Skill.

The model decides whether code is defective. This program owns scope, fingerprints,
location, lifecycle, coverage and final output so those facts are never trusted to
free-form model text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = 1
SKILL_VERSION = "0.1.0"
PROTOCOL_VERSION = "ocr-code-review-protocol-v1"

SUPPORTED_EXTENSIONS = {
    ".java", ".kt", ".kts", ".scala", ".groovy", ".py", ".pyi", ".js",
    ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".c", ".h", ".cpp", ".cc",
    ".cxx", ".hpp", ".hxx", ".cs", ".vb", ".fs", ".go", ".rs", ".rb",
    ".rake", ".gemspec", ".php", ".phtml", ".swift", ".m", ".mm", ".sh",
    ".bash", ".zsh", ".fish", ".ps1", ".sql", ".css", ".scss", ".sass",
    ".less", ".html", ".htm", ".ftl", ".ftlh", ".ftlx", ".astro", ".vue",
    ".svelte", ".xml", ".yaml", ".yml", ".json", ".toml", ".ini", ".env",
    ".gradle", ".cmake", ".r", ".lua", ".pl", ".pm", ".ex", ".exs",
    ".erl", ".hrl", ".ets", ".json5", ".dart", ".tf", ".graphql", ".gql",
    ".prisma", ".jl", ".hcl", ".tfvars", ".bicep", ".proto", ".nix",
    ".hs", ".lhs", ".nim", ".nims", ".nimble",
}

DEFAULT_EXCLUDES = [
    "**/*_test.go", "**/src/test/java/**/*.java", "**/src/test/**/*.kt",
    "**/*.test.{js,jsx,ts,tsx}", "**/*.spec.{js,jsx,ts,tsx}", "**/__tests__/**",
    "**/test/**/*_test.py", "**/tests/**/*_test.py", "**/*_test.py",
    "**/*_spec.rb", "**/spec/**/*_spec.rb", "**/*Test.java", "**/*Tests.java",
    "**/*_test.rs", "**/oh_modules/**", "**/*.test.ets", "**/test/**/*.jl",
    "**/test/**/*.hs", "**/*Spec.hs", "**/test/**/*.lhs", "**/*Spec.lhs",
    "**/tests/**/*.nim", "**/__snapshots__/**", "**/*.snap", "**/testdata/**",
    "**/fixtures/**", "**/*.generated.*", "**/*.gen.go", "**/*.pb.go",
    "**/*.pb.cc", "**/*.pb.h",
]

PROVIDER_EXCLUDED_DIRS = {
    ".idea", ".vscode", ".svn", ".git", "vendor", "node_modules", "target",
    ".happypack", ".cachefile", "_packages", "rpm", "pkgs",
}

VERIFIER_CATEGORIES = {"security", "concurrency", "transaction", "data-consistency", "data-loss"}
MATERIAL_BLIND_SPOT_SCOPES = {
    "primary-target", "changed-code", "core-path", "external-integration",
    "auth-boundary", "data-boundary",
}
BLIND_SPOT_SCOPES = MATERIAL_BLIND_SPOT_SCOPES | {"optional-tool", "peripheral"}
VALID_SEVERITIES = {"critical", "high", "medium", "low"}
VALID_CATEGORIES = {
    "bug", "security", "performance", "maintainability", "test", "style",
    "documentation", "concurrency", "transaction", "data-consistency", "data-loss", "other",
}
REQUIRED_FINDING_FIELDS = {
    "title", "claim", "severity", "category", "existing_code", "expected",
    "actual", "impact", "evidence",
}


class ReviewError(Exception):
    def __init__(self, code: str, message: str, next_action: str = "inspect_error", **details: Any):
        super().__init__(message)
        self.payload = {
            "error": code,
            "message": message,
            "next_action": next_action,
            **details,
        }


class JsonArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise ReviewError("INVALID_ARGUMENTS", message, "fix_command_arguments")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def canonical_hash(value: Any) -> str:
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return sha256_text(data)


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ReviewError("FILE_NOT_FOUND", f"Required file does not exist: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ReviewError("INVALID_JSON", f"Invalid JSON in {path}: {exc}") from exc
    except UnicodeError as exc:
        raise ReviewError("INVALID_ENCODING", f"Expected UTF-8 JSON in {path}: {exc}") from exc
    except OSError as exc:
        raise ReviewError("FILE_READ_FAILED", f"Cannot read {path}: {exc}") from exc


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def atomic_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(value)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


@contextmanager
def session_lock(session_dir: Path, timeout_seconds: float = 30.0):
    """Serialize manifest mutations across Cursor reviewer processes."""
    lock_path = session_dir / ".session.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    handle = open(lock_path, "a+b")
    if handle.seek(0, os.SEEK_END) == 0:
        handle.write(b"0")
        handle.flush()
    deadline = time.monotonic() + timeout_seconds
    acquired = False
    try:
        while not acquired:
            try:
                handle.seek(0)
                if os.name == "nt":
                    import msvcrt

                    msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl

                    fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
            except OSError:
                if time.monotonic() >= deadline:
                    raise ReviewError(
                        "SESSION_LOCK_TIMEOUT",
                        f"Timed out waiting for session lock: {lock_path}",
                        "retry_command",
                    )
                time.sleep(0.05)
        yield
    finally:
        if acquired:
            handle.seek(0)
            if os.name == "nt":
                import msvcrt

                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def git(repo: Path, *args: str, check: bool = True) -> str:
    proc = subprocess.run(
        ["git", "-c", "core.quotepath=false", *args],
        cwd=repo,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    if check and proc.returncode != 0:
        raise ReviewError("GIT_FAILED", proc.stderr.strip() or "git command failed", "fix_git_state")
    return proc.stdout


def git_root(repo: Path) -> Path:
    root = git(repo, "rev-parse", "--show-toplevel").strip()
    return Path(root).resolve()


def normalize_path(path: str) -> str:
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def expand_braces(pattern: str) -> list[str]:
    match = re.search(r"\{([^{}]+)\}", pattern)
    if not match:
        return [pattern]
    results: list[str] = []
    for option in match.group(1).split(","):
        expanded = pattern[: match.start()] + option + pattern[match.end() :]
        results.extend(expand_braces(expanded))
    return results


def glob_regex(pattern: str) -> re.Pattern[str]:
    pattern = normalize_path(pattern).lower()
    parts: list[str] = ["^"]
    i = 0
    while i < len(pattern):
        char = pattern[i]
        if char == "*":
            if i + 1 < len(pattern) and pattern[i + 1] == "*":
                i += 2
                if i < len(pattern) and pattern[i] == "/":
                    parts.append("(?:.*/)?")
                    i += 1
                else:
                    parts.append(".*")
                continue
            parts.append("[^/]*")
        elif char == "?":
            parts.append("[^/]")
        else:
            parts.append(re.escape(char))
        i += 1
    parts.append("$")
    return re.compile("".join(parts), re.IGNORECASE)


def glob_match(pattern: str, path: str) -> bool:
    normalized = normalize_path(path).lower()
    return any(glob_regex(item).match(normalized) is not None for item in expand_braces(pattern))


def matches_any(patterns: Iterable[str], path: str) -> bool:
    return any(glob_match(pattern, path) for pattern in patterns)


def excluded_provider_dir(path: str) -> bool:
    parts = normalize_path(path).split("/")[:-1]
    return any(part.lower() in PROVIDER_EXCLUDED_DIRS for part in parts)


def load_rule_file(
    path: Path, reference_root: Path | None = None, source: str = "rule"
) -> dict[str, Any] | None:
    if not path.exists():
        return None
    value = read_json(path)
    if not isinstance(value, dict):
        raise ReviewError("INVALID_RULE", f"Rule file must contain a JSON object: {path}")
    entries = value.get("rules", [])
    if not isinstance(entries, list):
        raise ReviewError("INVALID_RULE", f"rules must be an array: {path}")
    include = value.get("include", []) or []
    exclude = value.get("exclude", []) or []
    if not isinstance(include, list) or not all(isinstance(item, str) for item in include):
        raise ReviewError("INVALID_RULE", f"include must be an array of strings: {path}")
    if not isinstance(exclude, list) or not all(isinstance(item, str) for item in exclude):
        raise ReviewError("INVALID_RULE", f"exclude must be an array of strings: {path}")
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            raise ReviewError("INVALID_RULE", f"rules[{index}] must be an object: {path}")
        if not isinstance(entry.get("path"), str):
            raise ReviewError("INVALID_RULE", f"rules[{index}].path must be a string: {path}")
        rule = entry.get("rule", "")
        if not isinstance(rule, str):
            raise ReviewError("INVALID_RULE", f"rule must be a string: {path}")
        if not isinstance(entry.get("merge_system_rule", False), bool):
            raise ReviewError("INVALID_RULE", f"merge_system_rule must be boolean: {path}")
        if "\n" not in rule and " " not in rule and Path(rule).suffix.lower() in {".md", ".txt", ".markdown"}:
            referenced = Path(rule)
            if referenced.is_absolute():
                raise ReviewError(
                    "INVALID_RULE",
                    f"{source} rule references must be relative to their allowed root: {rule}",
                    "use_relative_rule_reference",
                )
            root = (reference_root or path.parent).resolve()
            referenced = root / referenced
            referenced = referenced.resolve()
            try:
                referenced.relative_to(root)
            except ValueError as exc:
                raise ReviewError("INVALID_RULE", f"Rule reference escapes allowed root: {rule}") from exc
            if not referenced.is_file():
                raise ReviewError("INVALID_RULE", f"Rule reference does not exist: {rule}")
            if referenced.stat().st_size > 512 * 1024:
                raise ReviewError("INVALID_RULE", f"Rule reference exceeds 512 KiB: {rule}")
            try:
                entry["rule"] = referenced.read_text(encoding="utf-8").rstrip("\n")
            except (OSError, UnicodeError) as exc:
                raise ReviewError("INVALID_RULE", f"Cannot read UTF-8 rule reference {rule}: {exc}") from exc
    value["_source_path"] = str(path.resolve())
    return value


def system_rules_root() -> Path:
    return Path(__file__).resolve().parents[1] / "references" / "rules"


def load_system_rules() -> dict[str, Any]:
    config_path = system_rules_root() / "system_rules.json"
    value = read_json(config_path)
    if not isinstance(value, dict) or not isinstance(value.get("path_rule_map", {}), dict):
        raise ReviewError("INVALID_RULE", f"Bundled system rules are invalid: {config_path}")
    return value


def rule_layers(repo: Path, custom_path: str | None) -> list[tuple[str, dict[str, Any]]]:
    layers: list[tuple[str, dict[str, Any]]] = []
    if custom_path:
        custom_path_obj = Path(custom_path).resolve()
        custom = load_rule_file(custom_path_obj, custom_path_obj.parent, "custom")
        if custom:
            layers.append(("custom", custom))
    project = load_rule_file(repo / ".opencodereview" / "rule.json", repo, "project")
    if project:
        layers.append(("project", project))
    global_path = Path.home() / ".opencodereview" / "rule.json"
    global_rule = load_rule_file(global_path, global_path.parent, "global")
    if global_rule:
        layers.append(("global", global_rule))
    return layers


def system_rule_for(path: str, config: dict[str, Any]) -> tuple[str, str]:
    rule_map = config.get("path_rule_map", {})
    for pattern, filename in rule_map.items():
        if glob_match(pattern, path):
            rule_path = system_rules_root() / "rule_docs" / filename
            if not rule_path.is_file():
                raise ReviewError("INVALID_RULE", f"Bundled rule document is missing: {rule_path}")
            text = rule_path.read_text(encoding="utf-8").rstrip("\n")
            return text, pattern
    default_name = config.get("default_rule", "default.md")
    default_path = system_rules_root() / "rule_docs" / default_name
    if not default_path.is_file():
        raise ReviewError("INVALID_RULE", f"Bundled default rule is missing: {default_path}")
    text = default_path.read_text(encoding="utf-8").rstrip("\n")
    return text, "default"


def resolved_rule(path: str, layers: list[tuple[str, dict[str, Any]]], system: dict[str, Any]) -> dict[str, str]:
    system_text, system_pattern = system_rule_for(path, system)
    for source, layer in layers:
        for entry in layer.get("rules", []):
            rule_text = entry.get("rule", "")
            if not rule_text and not entry.get("merge_system_rule", False):
                continue
            if glob_match(entry.get("path", ""), path):
                if entry.get("merge_system_rule", False):
                    if system_text and rule_text:
                        rule_text = (
                            "## System-Specific Rules (Mandatory)\n\n" + system_text
                            + "\n\n---\n\n## User-Specific Rules (Mandatory)\n\n" + rule_text
                        )
                    else:
                        rule_text = system_text or rule_text
                return {"text": rule_text, "source": source, "pattern": entry.get("path", "")}
    return {"text": system_text, "source": "system", "pattern": system_pattern}


def selected_file_filter(layers: list[tuple[str, dict[str, Any]]]) -> dict[str, list[str]] | None:
    for _source, layer in layers:
        include = layer.get("include", []) or []
        exclude = layer.get("exclude", []) or []
        if include or exclude:
            return {"include": [p.lower() for p in include], "exclude": [p.lower() for p in exclude]}
    return None


def should_review(path: str, file_filter: dict[str, list[str]] | None) -> bool:
    path = normalize_path(path)
    if excluded_provider_dir(path):
        return False
    if file_filter and matches_any(file_filter["exclude"], path):
        return False
    # OCR include is an admission override, not a whitelist.
    if file_filter and file_filter["include"] and matches_any(file_filter["include"], path):
        return True
    suffix = Path(path).suffix.lower()
    if suffix and suffix not in SUPPORTED_EXTENSIONS:
        return False
    if matches_any(DEFAULT_EXCLUDES, path):
        return False
    return True


def list_scan_files(repo: Path) -> list[str]:
    output = git(repo, "ls-files", "-co", "--exclude-standard", "-z")
    return sorted({normalize_path(item) for item in output.split("\0") if item})


def list_review_files(repo: Path, base: str, head: str) -> list[str]:
    git(repo, "rev-parse", "--verify", base)
    if head == "WORKTREE":
        output = git(repo, "diff", "--name-only", "--diff-filter=ACMRTUXB", "-z", base, "--")
        untracked = git(repo, "ls-files", "--others", "--exclude-standard", "-z")
        output += untracked
    else:
        git(repo, "rev-parse", "--verify", head)
        output = git(repo, "diff", "--name-only", "--diff-filter=ACMRTUXB", "-z", f"{base}...{head}")
    return sorted({normalize_path(item) for item in output.split("\0") if item})


def is_tracked(repo: Path, path: str) -> bool:
    return bool(git(repo, "ls-files", "--error-unmatch", "--", path, check=False).strip())


def review_diff_text(repo: Path, base: str, head: str, path: str, unified: int = 3) -> str:
    if head == "WORKTREE":
        if not is_tracked(repo, path):
            return "UNTRACKED\0" + file_bytes(repo, path).decode("utf-8", errors="replace")
        return git(repo, "diff", "--no-ext-diff", f"--unified={unified}", base, "--", path)
    return git(repo, "diff", "--no-ext-diff", f"--unified={unified}", f"{base}...{head}", "--", path)


def default_state_root(repo: Path) -> Path:
    raw = git(repo, "rev-parse", "--git-dir").strip()
    git_dir = Path(raw)
    if not git_dir.is_absolute():
        git_dir = repo / git_dir
    return git_dir.resolve() / "ocr-code-review" / "sessions"


def task_id_for(path: str) -> str:
    return "task-" + sha256_text(normalize_path(path))[:16]


def file_bytes(repo: Path, path: str) -> bytes:
    target = (repo / path).resolve()
    try:
        target.relative_to(repo.resolve())
    except ValueError as exc:
        raise ReviewError("PATH_ESCAPE", f"Path escapes repository: {path}") from exc
    if not target.exists():
        return b""
    try:
        return target.read_bytes()
    except OSError as exc:
        raise ReviewError("FILE_READ_FAILED", f"Cannot read repository file {path}: {exc}") from exc


def is_binary_file(repo: Path, path: str) -> bool:
    return b"\x00" in file_bytes(repo, path)[:8000]


def is_regular_workspace_file(repo: Path, path: str) -> bool:
    candidate = repo / path
    return candidate.is_file() and not candidate.is_symlink()


def task_input_hash(
    repo: Path,
    path: str,
    mode: str,
    rule: dict[str, str],
    requirement_hash: str,
    base: str | None = None,
    head: str | None = None,
    dimensions: Iterable[str] | None = None,
) -> str:
    diff_sha256 = ""
    if mode == "review":
        if not base or not head:
            raise ReviewError("BASE_REQUIRED", "review task hashing requires base and head")
        diff_text = review_diff_text(repo, base, head, path)
        diff_sha256 = sha256_text(diff_text)
    return canonical_hash(
        {
            "mode": mode,
            "path": normalize_path(path),
            "content_sha256": sha256_bytes(file_bytes(repo, path)),
            "base": base if mode == "review" else None,
            "head": head if mode == "review" else None,
            "diff_sha256": diff_sha256,
            "rule_sha256": sha256_text(rule["text"]),
            "protocol": PROTOCOL_VERSION,
            "requirement_sha256": requirement_hash,
            "dimensions": list(dimensions or ["correctness"]),
        }
    )


def stack_card_for(paths: list[str]) -> dict[str, Any]:
    extensions = Counter(Path(path).suffix.lower() or "[none]" for path in paths)
    build_markers = {
        "go.mod": "Go modules", "package.json": "Node.js", "pom.xml": "Maven",
        "build.gradle": "Gradle", "Cargo.toml": "Cargo", "pyproject.toml": "Python",
        "Dockerfile": "Docker",
    }
    names = {Path(path).name for path in paths}
    return {
        "source": "deterministic-preflight",
        "languages": dict(sorted(extensions.items(), key=lambda item: (-item[1], item[0]))),
        "build_systems": sorted(label for marker, label in build_markers.items() if marker in names),
        "entrypoints": [],
        "data_stores": [],
        "external_integrations": [],
        "auth_boundaries": [],
        "delivery_surfaces": [],
        "scan_tools": {"cursor_native": True, "rg": None, "ast_grep": None, "codegraph": None},
        "signals_pending_model_enrichment": True,
    }


def build_task(
    repo: Path,
    path: str,
    mode: str,
    rule: dict[str, str],
    requirement_hash: str,
    base: str | None,
    head: str,
    segment_threshold: int,
) -> dict[str, Any]:
    task_id = task_id_for(path)
    content = file_bytes(repo, path)
    dimensions = ["correctness"]
    return {
        "id": task_id,
        "path": path,
        "status": "pending",
        "input_hash": task_input_hash(
            repo, path, mode, rule, requirement_hash, base, head, dimensions
        ),
        "content_sha256": sha256_bytes(content),
        "rule": {"source": rule["source"], "pattern": rule["pattern"], "sha256": sha256_text(rule["text"])},
        "segmented": len(content) > segment_threshold,
        "content_size": len(content),
        "dimensions": dimensions,
        "routing_signals": [],
        "context_dependencies": {},
    }


def load_session(session: str) -> tuple[Path, dict[str, Any], dict[str, Any]]:
    session_dir = Path(session).resolve()
    session_json = read_json(session_dir / "session.json")
    manifest = read_json(session_dir / "manifest.json")
    return session_dir, session_json, manifest


def save_session(session_dir: Path, session_json: dict[str, Any], manifest: dict[str, Any]) -> None:
    session_json["updated_at"] = now()
    manifest["updated_at"] = session_json["updated_at"]
    atomic_json(session_dir / "session.json", session_json)
    atomic_json(session_dir / "manifest.json", manifest)


def require_task_state(task: dict[str, Any], allowed: set[str], action: str) -> None:
    status = task.get("status")
    if status not in allowed:
        raise ReviewError(
            "INVALID_TASK_STATE",
            f"Cannot {action} task {task.get('id', '<unknown>')} while its state is {status!r}",
            "follow_task_lifecycle",
            allowed_states=sorted(allowed),
        )


def cmd_init(args: argparse.Namespace) -> dict[str, Any]:
    repo = git_root(Path(args.repo).resolve())
    if args.mode == "review" and not args.base:
        raise ReviewError("BASE_REQUIRED", "review mode requires an explicit diff base", "ask_user_for_diff_base")
    head = "WORKTREE" if args.workspace else (args.head or "HEAD")
    paths = list_scan_files(repo) if args.mode == "scan" else list_review_files(repo, args.base, head)
    layers = rule_layers(repo, args.rule)
    file_filter = selected_file_filter(layers)
    primary_paths = [
        path
        for path in paths
        if is_regular_workspace_file(repo, path)
        and not is_binary_file(repo, path)
        and should_review(path, file_filter)
    ]
    system = load_system_rules()
    requirement_hash = sha256_text(args.requirement or "")
    session_id = args.session_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", session_id) or session_id in {".", ".."}:
        raise ReviewError("INVALID_SESSION_ID", "Session ID may contain only letters, digits, dot, underscore and hyphen")
    state_root = Path(args.state_root).resolve() if args.state_root else default_state_root(repo)
    session_dir = state_root / session_id

    tasks: dict[str, Any] = {}
    for path in primary_paths:
        rule = resolved_rule(path, layers, system)
        task = build_task(
            repo, path, args.mode, rule, requirement_hash, args.base, head, args.segment_threshold
        )
        tasks[task["id"]] = task

    config_hashes = {
        "rules": canonical_hash([layer for _source, layer in layers] + [system]),
        "file_filter": canonical_hash(file_filter or {}),
        "protocol": sha256_text(PROTOCOL_VERSION),
        "requirement": requirement_hash,
    }
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "session_id": session_id,
        "mode": args.mode,
        "tasks": tasks,
        "scheduling": {"concurrency": args.concurrency, "batches": "none", "ordering": "host-managed"},
        "filter": file_filter,
        "excluded_count": len(paths) - len(primary_paths),
        "created_at": now(),
        "updated_at": now(),
    }
    session_json = {
        "schema_version": SCHEMA_VERSION,
        "skill_version": SKILL_VERSION,
        "session_id": session_id,
        "repo_root": str(repo),
        "repo_identity": git(repo, "config", "--get", "remote.origin.url", check=False).strip() or str(repo),
        "mode": args.mode,
        "profile": args.profile,
        "base": args.base,
        "head": head,
        "status": "running",
        "assurance": "full",
        "requirement": args.requirement or "",
        "custom_rule_path": str(Path(args.rule).resolve()) if args.rule else None,
        "segment_threshold": args.segment_threshold,
        "config_hashes": config_hashes,
        "stack_card": stack_card_for(paths),
        "created_at": now(),
        "updated_at": now(),
    }
    try:
        session_dir.mkdir(parents=True, exist_ok=False)
    except FileExistsError as exc:
        raise ReviewError(
            "SESSION_EXISTS", f"Session already exists: {session_dir}", "choose_new_session_or_resume"
        ) from exc
    save_session(session_dir, session_json, manifest)
    return {
        "session_id": session_id,
        "session_dir": str(session_dir),
        "mode": args.mode,
        "primary_tasks": len(tasks),
        "excluded": len(paths) - len(primary_paths),
        "next_action": "enrich_stack_card_then_dispatch_tasks",
    }


def cmd_task_start(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, session_json, manifest = load_session(args.session)
    task = manifest["tasks"].get(args.task)
    if not task:
        raise ReviewError("TASK_NOT_FOUND", f"Unknown task: {args.task}")
    require_task_state(task, {"pending", "interrupted", "checkpointed", "stale"}, "start")
    task["status"] = "running"
    task["started_at"] = now()
    task_file = session_dir / "tasks" / f"{args.task}.json"
    atomic_json(task_file, task)
    save_session(session_dir, session_json, manifest)
    return {"task_id": args.task, "status": "running", "primary_path": task["path"]}


def cmd_task_plan(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, session_json, manifest = load_session(args.session)
    task = manifest["tasks"].get(args.task)
    if not task:
        raise ReviewError("TASK_NOT_FOUND", f"Unknown task: {args.task}")
    require_task_state(task, {"pending", "stale"}, "plan")
    payload = read_json(Path(args.input))
    if not isinstance(payload, dict):
        raise ReviewError("INVALID_TASK_PLAN", "Task plan must be a JSON object")
    dimensions = payload.get("dimensions")
    if (
        not isinstance(dimensions, list)
        or not dimensions
        or not all(isinstance(item, str) and item.strip() for item in dimensions)
        or len(set(dimensions)) != len(dimensions)
    ):
        raise ReviewError("INVALID_TASK_PLAN", "dimensions must be unique non-empty strings")
    if "correctness" not in dimensions:
        raise ReviewError("INVALID_TASK_PLAN", "Every task plan must retain the correctness dimension")
    signals = payload.get("signals", [])
    if not isinstance(signals, list) or not all(
        isinstance(item, dict)
        and isinstance(item.get("name"), str)
        and bool(item.get("name"))
        and isinstance(item.get("evidence"), str)
        and bool(item.get("evidence"))
        for item in signals
    ):
        raise ReviewError("INVALID_TASK_PLAN", "signals require non-empty name and evidence strings")
    repo = Path(session_json["repo_root"])
    layers = rule_layers(repo, session_json.get("custom_rule_path"))
    rule = resolved_rule(task["path"], layers, load_system_rules())
    task["dimensions"] = dimensions
    task["routing_signals"] = signals
    task["rule"] = {
        "source": rule["source"],
        "pattern": rule["pattern"],
        "sha256": sha256_text(rule["text"]),
    }
    task["input_hash"] = task_input_hash(
        repo,
        task["path"],
        session_json["mode"],
        rule,
        session_json["config_hashes"]["requirement"],
        session_json.get("base"),
        session_json.get("head"),
        dimensions,
    )
    task["planned_at"] = now()
    atomic_json(session_dir / "tasks" / f"{args.task}.json", task)
    save_session(session_dir, session_json, manifest)
    return {"task_id": args.task, "dimensions": dimensions, "signals": len(signals)}


def exact_anchor(content: str, snippet: str) -> tuple[int, int, int]:
    if not snippet:
        raise ReviewError("LOCATION_FAILED", "existing_code must not be empty", "resubmit_with_exact_existing_code")
    starts: list[int] = []
    position = content.find(snippet)
    while position >= 0:
        starts.append(position)
        position = content.find(snippet, position + 1)
    if not starts:
        raise ReviewError("LOCATION_FAILED", "existing_code was not found verbatim in the primary target", "resubmit_with_exact_existing_code")
    if len(starts) != 1:
        raise ReviewError(
            "LOCATION_AMBIGUOUS",
            "existing_code occurs more than once in the primary target",
            "resubmit_with_larger_existing_code",
            occurrences=len(starts),
        )
    start = starts[0]
    start_line = content.count("\n", 0, start) + 1
    line_count = snippet.count("\n") + (0 if snippet.endswith("\n") else 1)
    end_line = start_line + max(line_count - 1, 0)
    return start, start_line, end_line


def changed_new_ranges(repo: Path, base: str, head: str, path: str) -> list[tuple[int, int]]:
    if head == "WORKTREE" and not is_tracked(repo, path):
        line_count = len(file_bytes(repo, path).decode("utf-8", errors="replace").splitlines())
        return [(1, max(line_count, 1))]
    diff = review_diff_text(repo, base, head, path, unified=0)
    ranges: list[tuple[int, int]] = []
    for line in diff.splitlines():
        match = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", line)
        if match:
            start = int(match.group(1))
            count = int(match.group(2) or "1")
            if count > 0:
                ranges.append((start, start + count - 1))
    return ranges


def deleted_hunk_texts(repo: Path, base: str, head: str, path: str) -> list[str]:
    if head == "WORKTREE" and not is_tracked(repo, path):
        return []
    diff = review_diff_text(repo, base, head, path, unified=0).replace("\r\n", "\n")
    hunks: list[str] = []
    current: list[str] = []
    inside_hunk = False
    for line in diff.splitlines():
        if line.startswith("@@"):
            if current:
                hunks.append("\n".join(current))
                current = []
            inside_hunk = True
        elif inside_hunk and line.startswith("-") and not line.startswith("---"):
            current.append(line[1:])
        elif current:
            hunks.append("\n".join(current))
            current = []
    if current:
        hunks.append("\n".join(current))
    return hunks


def matches_deleted_line_sequence(evidence: str, hunks: Iterable[str]) -> bool:
    evidence_lines = evidence.split("\n")
    for hunk in hunks:
        deleted_lines = hunk.split("\n")
        width = len(evidence_lines)
        for index in range(len(deleted_lines) - width + 1):
            if deleted_lines[index : index + width] == evidence_lines:
                return True
    return False


def verification_required(payload: dict[str, Any]) -> bool:
    if payload["severity"] in {"critical", "high"}:
        return True
    if payload["category"] in VERIFIER_CATEGORIES:
        return True
    flags = payload.get("risk_flags", [])
    return any(flag in {"cross-file", "framework-dependent", "version-dependent", "uncertain-evidence"} for flag in flags)


def finding_files(session_dir: Path, task_id: str | None = None) -> list[Path]:
    root = session_dir / "findings"
    if not root.exists():
        return []
    pattern = f"{task_id}/*.json" if task_id else "*/*.json"
    return sorted(root.glob(pattern))


def cmd_submit(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, session_json, manifest = load_session(args.session)
    task = manifest["tasks"].get(args.task)
    if not task:
        raise ReviewError("TASK_NOT_FOUND", f"Unknown task: {args.task}")
    require_task_state(task, {"running"}, "submit a finding for")
    payload = read_json(Path(args.input))
    if not isinstance(payload, dict):
        raise ReviewError("INVALID_FINDING", "Finding input must be a JSON object", "resubmit_finding")
    missing = sorted(REQUIRED_FINDING_FIELDS - payload.keys())
    if missing:
        raise ReviewError("INVALID_FINDING", f"Missing required fields: {', '.join(missing)}", "resubmit_finding")
    if any(key in payload for key in ("path", "file", "start_line", "end_line", "line")):
        raise ReviewError("MODEL_LOCATION_FORBIDDEN", "Model input must not provide trusted path or line fields", "remove_location_fields")
    if payload["severity"] not in VALID_SEVERITIES:
        raise ReviewError("INVALID_SEVERITY", f"Unsupported severity: {payload['severity']}")
    if payload["category"] not in VALID_CATEGORIES:
        raise ReviewError("INVALID_CATEGORY", f"Unsupported category: {payload['category']}")
    string_fields = REQUIRED_FINDING_FIELDS - {"evidence"}
    if any(not isinstance(payload[field], str) or not payload[field].strip() for field in string_fields):
        raise ReviewError("INVALID_FINDING", "Finding text fields must be non-empty strings", "resubmit_finding")
    if (
        not isinstance(payload["evidence"], list)
        or not payload["evidence"]
        or not all(isinstance(item, str) and item.strip() for item in payload["evidence"])
    ):
        raise ReviewError("EVIDENCE_REQUIRED", "A finding requires at least one evidence item", "investigate_candidate")
    risk_flags = payload.get("risk_flags", [])
    if not isinstance(risk_flags, list) or not all(isinstance(item, str) for item in risk_flags):
        raise ReviewError("INVALID_FINDING", "risk_flags must be an array of strings", "resubmit_finding")
    delivery_impact = payload.get("delivery_impact")
    if delivery_impact is not None and delivery_impact not in {"P0", "P1", "P2"}:
        raise ReviewError(
            "INVALID_DELIVERY_IMPACT",
            "delivery_impact must be P0, P1 or P2 when supplied",
            "resubmit_finding",
        )
    repo = Path(session_json["repo_root"])
    path = task["path"]
    content = file_bytes(repo, path).decode("utf-8", errors="replace").replace("\r\n", "\n")
    snippet = str(payload["existing_code"]).replace("\r\n", "\n")
    _offset, start_line, end_line = exact_anchor(content, snippet)

    if session_json["mode"] == "review":
        ranges = changed_new_ranges(repo, session_json["base"], session_json["head"], path)
        overlaps = any(start_line <= right and end_line >= left for left, right in ranges)
        deletion_evidence = False
        if payload.get("change_kind") == "deletion":
            raw_evidence = payload.get("change_evidence")
            if not isinstance(raw_evidence, str) or not raw_evidence.strip():
                raise ReviewError(
                    "INVALID_DELETION_EVIDENCE",
                    "Deletion findings require non-empty verbatim change_evidence",
                    "resubmit_with_deleted_hunk_evidence",
                )
            evidence = raw_evidence.replace("\r\n", "\n").strip("\n")
            deletion_evidence = matches_deleted_line_sequence(
                evidence,
                deleted_hunk_texts(repo, session_json["base"], session_json["head"], path),
            )
            if not deletion_evidence:
                raise ReviewError(
                    "INVALID_DELETION_EVIDENCE",
                    "change_evidence was not found verbatim in a deleted diff hunk",
                    "resubmit_with_deleted_hunk_evidence",
                )
        if not overlaps and not deletion_evidence:
            raise ReviewError(
                "OUTSIDE_DIFF",
                "Anchor does not overlap a new-side diff hunk and has no deletion change evidence",
                "investigate_diff_relation",
            )

    location_fingerprint = sha256_text(f"{path}\0{snippet}")
    finding_id = "finding-" + sha256_text(
        f"{args.task}\0{task['input_hash']}\0{payload['claim']}\0{location_fingerprint}"
    )[:16]
    required = verification_required(payload)
    finding = {
        "schema_version": SCHEMA_VERSION,
        "id": finding_id,
        "task_id": args.task,
        "state": "candidate" if required else "confirmed",
        "model_input": payload,
        "title": payload["title"],
        "claim": payload["claim"],
        "severity": payload["severity"],
        "category": payload["category"],
        "expected": payload["expected"],
        "actual": payload["actual"],
        "impact": payload["impact"],
        "delivery_impact": delivery_impact,
        "evidence": payload["evidence"],
        "change_evidence": payload.get("change_evidence"),
        "location": {
            "path": path,
            "start_line": start_line,
            "end_line": end_line,
            "existing_code": snippet,
            "fingerprint": location_fingerprint,
        },
        "verification": {"required": required, "status": "pending" if required else "not-required"},
        "input_hash": task["input_hash"],
        "revision": task["input_hash"][:16],
        "created_at": now(),
        "xref": payload.get("xref", []),
    }
    target = session_dir / "findings" / args.task / f"{finding_id}.json"
    if target.exists():
        return {"finding_id": finding_id, "finding_file": str(target), "duplicate": True}
    atomic_json(target, finding)
    return {
        "finding_id": finding_id,
        "finding_file": str(target),
        "state": finding["state"],
        "next_action": "verify_finding" if required else "continue_review",
    }


def find_finding(session_dir: Path, finding_id: str) -> tuple[Path, dict[str, Any]]:
    matches = [path for path in finding_files(session_dir) if path.stem == finding_id]
    if len(matches) != 1:
        raise ReviewError("FINDING_NOT_FOUND", f"Expected one finding named {finding_id}, found {len(matches)}")
    return matches[0], read_json(matches[0])


def cmd_verify(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, _session_json, _manifest = load_session(args.session)
    path, finding = find_finding(session_dir, args.finding)
    if finding.get("state") != "candidate" or finding.get("verification", {}).get("status") != "pending":
        raise ReviewError(
            "INVALID_FINDING_STATE",
            f"Finding {args.finding} is not awaiting verification",
            "choose_pending_finding",
        )
    finding["verification"] = {
        "required": True,
        "status": "confirmed" if args.decision == "confirm" else "rejected",
        "reason": args.reason,
        "verified_at": now(),
    }
    finding["state"] = "confirmed" if args.decision == "confirm" else "rejected"
    atomic_json(path, finding)
    return {"finding_id": args.finding, "state": finding["state"]}


def normalize_coverage(coverage: Any, segmented: bool) -> dict[str, Any]:
    if not isinstance(coverage, dict):
        raise ReviewError("INVALID_COVERAGE", "Coverage must be a JSON object", "complete_coverage_ledger")
    required = {"primary_target_complete", "symbols", "ranges", "dimensions", "skipped", "blind_spots", "pending_questions"}
    missing = sorted(required - coverage.keys())
    if missing:
        raise ReviewError("INVALID_COVERAGE", f"Coverage is missing: {', '.join(missing)}", "complete_coverage_ledger")
    if coverage["primary_target_complete"] is not True:
        raise ReviewError("PRIMARY_TARGET_INCOMPLETE", "Primary target is not completely reviewed", "continue_review")
    if not isinstance(coverage["symbols"], list) or not all(
        isinstance(item, str) and item.strip() for item in coverage["symbols"]
    ):
        raise ReviewError("INVALID_COVERAGE", "symbols must be an array of strings", "complete_coverage_ledger")
    if not isinstance(coverage["ranges"], list):
        raise ReviewError("INVALID_COVERAGE", "ranges must be an array", "complete_coverage_ledger")
    normalized_ranges: list[dict[str, int]] = []
    for item in coverage["ranges"]:
        if isinstance(item, (list, tuple)) and len(item) == 2:
            start_line, end_line = item
        elif isinstance(item, dict):
            start_line, end_line = item.get("start_line"), item.get("end_line")
        else:
            raise ReviewError(
                "INVALID_COVERAGE",
                "Each range must be [start_line, end_line] or an object with those fields",
                "complete_coverage_ledger",
            )
        if (
            not isinstance(start_line, int)
            or isinstance(start_line, bool)
            or not isinstance(end_line, int)
            or isinstance(end_line, bool)
            or start_line < 1
            or end_line < start_line
        ):
            raise ReviewError(
                "INVALID_COVERAGE",
                "Coverage ranges require positive ordered integer line numbers",
                "complete_coverage_ledger",
            )
        normalized_ranges.append({"start_line": start_line, "end_line": end_line})
    if (
        not isinstance(coverage["dimensions"], list)
        or not coverage["dimensions"]
        or not all(isinstance(item, str) and item.strip() for item in coverage["dimensions"])
    ):
        raise ReviewError("DIMENSIONS_MISSING", "At least one completed review dimension is required", "record_review_dimensions")
    if not isinstance(coverage["skipped"], list) or not all(
        isinstance(item, dict)
        and isinstance(item.get("dimension"), str)
        and isinstance(item.get("reason"), str)
        for item in coverage["skipped"]
    ):
        raise ReviewError("INVALID_COVERAGE", "skipped entries require string dimension and reason", "complete_coverage_ledger")
    if not isinstance(coverage["blind_spots"], list):
        raise ReviewError("INVALID_COVERAGE", "blind_spots must be an array", "complete_coverage_ledger")
    normalized_blind_spots: list[dict[str, Any]] = []
    for item in coverage["blind_spots"]:
        if not isinstance(item, dict) or not all(isinstance(item.get(key), str) and item.get(key) for key in ("area", "reason", "scope")):
            raise ReviewError(
                "INVALID_COVERAGE",
                "Each blind spot requires non-empty area, reason and scope strings",
                "complete_coverage_ledger",
            )
        if item["scope"] not in BLIND_SPOT_SCOPES:
            raise ReviewError("INVALID_COVERAGE", f"Unsupported blind spot scope: {item['scope']}")
        normalized = dict(item)
        normalized["material"] = item["scope"] in MATERIAL_BLIND_SPOT_SCOPES
        normalized_blind_spots.append(normalized)
    if not isinstance(coverage["pending_questions"], list) or not all(
        isinstance(item, str) for item in coverage["pending_questions"]
    ):
        raise ReviewError("INVALID_COVERAGE", "pending_questions must be an array of strings", "complete_coverage_ledger")
    if coverage["pending_questions"]:
        raise ReviewError("PENDING_QUESTIONS", "Coverage still has pending questions", "resolve_pending_questions")
    if segmented and not coverage["symbols"] and not coverage["ranges"]:
        raise ReviewError("SEGMENT_COVERAGE_MISSING", "Segmented tasks require symbol or range coverage", "continue_segmented_review")
    context_paths = coverage.get("context_paths", [])
    if not isinstance(context_paths, list) or not all(isinstance(item, str) for item in context_paths):
        raise ReviewError("INVALID_COVERAGE", "context_paths must be an array of strings", "complete_coverage_ledger")
    rejected = coverage.get("rejected_candidates", [])
    if not isinstance(rejected, list):
        raise ReviewError("INVALID_COVERAGE", "rejected_candidates must be an array", "complete_coverage_ledger")
    normalized_coverage = dict(coverage)
    normalized_coverage["ranges"] = normalized_ranges
    normalized_coverage["blind_spots"] = normalized_blind_spots
    normalized_coverage["context_paths"] = context_paths
    normalized_coverage["rejected_candidates"] = rejected
    return normalized_coverage


def context_dependency_hashes(repo: Path, paths: Iterable[str]) -> dict[str, str]:
    hashes: dict[str, str] = {}
    root = repo.resolve()
    for raw_path in paths:
        path = normalize_path(str(raw_path))
        target = (root / path).resolve()
        try:
            target.relative_to(root)
        except ValueError as exc:
            raise ReviewError("PATH_ESCAPE", f"Context path escapes repository: {raw_path}") from exc
        if not target.is_file():
            raise ReviewError("CONTEXT_NOT_FOUND", f"Context dependency does not exist: {path}", "fix_coverage_context_paths")
        try:
            hashes[path] = sha256_bytes(target.read_bytes())
        except OSError as exc:
            raise ReviewError("FILE_READ_FAILED", f"Cannot read context dependency {path}: {exc}") from exc
    return hashes


def cmd_checkpoint(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, session_json, manifest = load_session(args.session)
    task = manifest["tasks"].get(args.task)
    if not task:
        raise ReviewError("TASK_NOT_FOUND", f"Unknown task: {args.task}")
    require_task_state(task, {"running"}, "checkpoint")
    payload = read_json(Path(args.input))
    if not isinstance(payload, dict):
        raise ReviewError("INVALID_CHECKPOINT", "Checkpoint input must be a JSON object")
    required = {"covered_symbols", "covered_ranges", "finding_ids", "rejected_candidates", "pending_questions", "next_action"}
    missing = sorted(required - payload.keys())
    if missing:
        raise ReviewError("INVALID_CHECKPOINT", f"Checkpoint is missing: {', '.join(missing)}")
    payload.update({"task_id": args.task, "input_hash": task["input_hash"], "updated_at": now()})
    atomic_json(session_dir / "checkpoints" / f"{args.task}.json", payload)
    task["status"] = "checkpointed"
    save_session(session_dir, session_json, manifest)
    return {"task_id": args.task, "status": "checkpointed", "next_action": payload["next_action"]}


def cmd_complete(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, session_json, manifest = load_session(args.session)
    task = manifest["tasks"].get(args.task)
    if not task:
        raise ReviewError("TASK_NOT_FOUND", f"Unknown task: {args.task}")
    require_task_state(task, {"running"}, "complete")
    coverage = normalize_coverage(read_json(Path(args.coverage)), bool(task.get("segmented")))
    accounted_dimensions = set(coverage["dimensions"]) | {
        item["dimension"] for item in coverage["skipped"]
    }
    missing_dimensions = sorted(set(task.get("dimensions", ["correctness"])) - accounted_dimensions)
    if missing_dimensions:
        raise ReviewError(
            "DIMENSION_COVERAGE_MISSING",
            "Planned review dimensions are neither covered nor explicitly skipped",
            "complete_coverage_ledger",
            dimensions=missing_dimensions,
        )
    pending = []
    for path in finding_files(session_dir, args.task):
        finding = read_json(path)
        if (
            finding.get("state") == "candidate"
            and finding.get("verification", {}).get("required")
            and finding.get("verification", {}).get("status") == "pending"
        ):
            pending.append(finding["id"])
    if pending:
        raise ReviewError("VERIFIER_PENDING", "Findings still require independent verification", "run_verifier", finding_ids=pending)
    task["status"] = "complete"
    task["coverage"] = coverage
    task["context_dependencies"] = context_dependency_hashes(
        Path(session_json["repo_root"]), coverage.get("context_paths", [])
    )
    task["completed_at"] = now()
    task["completed_input_hash"] = task["input_hash"]
    atomic_json(session_dir / "tasks" / f"{args.task}.json", task)
    checkpoint = session_dir / "checkpoints" / f"{args.task}.json"
    if checkpoint.exists():
        checkpoint.unlink()
    save_session(session_dir, session_json, manifest)
    return {"task_id": args.task, "status": "complete", "blind_spots": coverage["blind_spots"]}


def cmd_stack_card(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, session_json, manifest = load_session(args.session)
    card = read_json(Path(args.input))
    if not isinstance(card, dict):
        raise ReviewError("INVALID_STACK_CARD", "Stack Card must be a JSON object")
    required = {"languages", "build_systems", "entrypoints", "data_stores", "external_integrations", "auth_boundaries", "delivery_surfaces", "scan_tools"}
    missing = sorted(required - card.keys())
    if missing:
        raise ReviewError("INVALID_STACK_CARD", f"Stack Card is missing: {', '.join(missing)}")
    card["source"] = "review-preflight"
    card["signals_pending_model_enrichment"] = False
    session_json["stack_card"] = card
    save_session(session_dir, session_json, manifest)
    return {"session_id": session_json["session_id"], "stack_card": "updated"}


def mark_findings_superseded(session_dir: Path, task_id: str, reason: str) -> None:
    for path in finding_files(session_dir, task_id):
        finding = read_json(path)
        if finding.get("state") in {"candidate", "confirmed"}:
            finding["state"] = "superseded"
            finding["superseded_reason"] = reason
            finding["superseded_at"] = now()
            atomic_json(path, finding)


def cmd_resume(args: argparse.Namespace) -> dict[str, Any]:
    session_dir, session_json, manifest = load_session(args.session)
    repo = Path(session_json["repo_root"])
    replacement_rule = getattr(args, "rule", None)
    custom_rule_path = replacement_rule or session_json.get("custom_rule_path")
    if replacement_rule:
        session_json["custom_rule_path"] = str(Path(replacement_rule).resolve())
        custom_rule_path = session_json["custom_rule_path"]
    layers = rule_layers(repo, custom_rule_path)
    system = load_system_rules()
    file_filter = selected_file_filter(layers)
    listed_paths = (
        list_scan_files(repo)
        if session_json["mode"] == "scan"
        else list_review_files(repo, session_json["base"], session_json["head"])
    )
    primary_paths = {
        path
        for path in listed_paths
        if is_regular_workspace_file(repo, path)
        and not is_binary_file(repo, path)
        and should_review(path, file_filter)
    }
    stale: list[str] = []
    interrupted: list[str] = []
    removed: list[str] = []
    added: list[str] = []
    by_path = {task["path"]: task_id for task_id, task in manifest["tasks"].items()}
    for path, task_id in by_path.items():
        if path not in primary_paths and manifest["tasks"][task_id]["status"] != "removed":
            manifest["tasks"][task_id]["status"] = "removed"
            manifest["tasks"][task_id]["removed_at"] = now()
            removed.append(task_id)
            mark_findings_superseded(session_dir, task_id, "Primary Target removed or filtered")
    for path in sorted(primary_paths):
        task_id = by_path.get(path)
        if task_id is None or manifest["tasks"][task_id]["status"] == "removed":
            rule = resolved_rule(path, layers, system)
            task = build_task(
                repo,
                path,
                session_json["mode"],
                rule,
                session_json["config_hashes"]["requirement"],
                session_json.get("base"),
                session_json.get("head", "HEAD"),
                int(session_json.get("segment_threshold", 256 * 1024)),
            )
            manifest["tasks"][task["id"]] = task
            added.append(task["id"])
    for task_id, task in manifest["tasks"].items():
        if task["status"] == "removed" or task_id in added:
            continue
        rule = resolved_rule(task["path"], layers, system)
        current_hash = task_input_hash(
            repo,
            task["path"],
            session_json["mode"],
            rule,
            session_json["config_hashes"]["requirement"],
            session_json.get("base"),
            session_json.get("head"),
            task.get("dimensions", ["correctness"]),
        )
        changed_context = [
            path
            for path, fingerprint in task.get("context_dependencies", {}).items()
            if sha256_bytes(file_bytes(repo, path)) != fingerprint
        ]
        if current_hash != task["input_hash"] or changed_context:
            task["status"] = "stale"
            task["input_hash"] = current_hash
            task["content_sha256"] = sha256_bytes(file_bytes(repo, task["path"]))
            task["stale_reason"] = (
                "context dependency changed: " + ", ".join(changed_context)
                if changed_context
                else "task input fingerprint changed"
            )
            stale.append(task_id)
            mark_findings_superseded(session_dir, task_id, task["stale_reason"])
        elif task["status"] == "running":
            task["status"] = "interrupted"
            interrupted.append(task_id)
        task["rule"] = {
            "source": rule["source"],
            "pattern": rule["pattern"],
            "sha256": sha256_text(rule["text"]),
        }
    session_json["status"] = "running"
    session_json["config_hashes"]["rules"] = canonical_hash([layer for _source, layer in layers] + [system])
    session_json["config_hashes"]["file_filter"] = canonical_hash(file_filter or {})
    manifest["filter"] = file_filter
    save_session(session_dir, session_json, manifest)
    return {
        "stale_tasks": stale,
        "interrupted_tasks": interrupted,
        "removed_tasks": removed,
        "added_tasks": added,
        "next_action": "dispatch_non_complete_tasks",
    }


def cmd_status(args: argparse.Namespace) -> dict[str, Any]:
    _session_dir, session_json, manifest = load_session(args.session)
    counts = Counter(task["status"] for task in manifest["tasks"].values())
    return {
        "session_id": session_json["session_id"],
        "status": session_json["status"],
        "assurance": session_json.get("assurance", "full"),
        "tasks": dict(sorted(counts.items())),
    }


def finding_is_fresh(repo: Path, finding: dict[str, Any]) -> bool:
    location = finding.get("location", {})
    path = location.get("path", "")
    snippet = location.get("existing_code", "")
    if not path or not snippet:
        return False
    content = file_bytes(repo, path).decode("utf-8", errors="replace").replace("\r\n", "\n")
    try:
        _offset, start, end = exact_anchor(content, snippet)
    except ReviewError:
        return False
    return start == location.get("start_line") and end == location.get("end_line")


def render_markdown(result: dict[str, Any]) -> str:
    lines = ["# OCR Code Review Result", "", result["conclusion"], ""]
    lines.extend([
        f"- Completion: `{result['completion_status']}`",
        f"- Assurance: `{result['assurance']}`",
        f"- Confirmed findings: `{len(result['findings'])}`",
        "",
    ])
    if result["findings"]:
        lines.extend(["## Findings", ""])
        for finding in result["findings"]:
            loc = finding["location"]
            lines.extend([
                f"### {finding['id']} · {finding['severity']} · {finding['title']}",
                "",
                f"`{loc['path']}:{loc['start_line']}`",
                "",
                finding["claim"],
                "",
                f"Impact: {finding['impact']}",
                "",
            ])
    if result["blind_spots"]:
        lines.extend(["## Coverage limits", ""])
        for blind in result["blind_spots"]:
            lines.append(f"- {blind.get('area', 'unknown')}: {blind.get('reason', 'not specified')}")
        lines.append("")
    return "\n".join(lines)


def cmd_finalize(args: argparse.Namespace) -> dict[str, Any]:
    reconciled = cmd_resume(argparse.Namespace(session=args.session, rule=None))
    session_dir, session_json, manifest = load_session(args.session)
    repo = Path(session_json["repo_root"])
    stale_tasks = reconciled["stale_tasks"]
    active_tasks = [task for task in manifest["tasks"].values() if task["status"] != "removed"]
    task_states = {task["status"] for task in active_tasks}
    complete = bool(active_tasks) and task_states == {"complete"}
    blind_spots: list[dict[str, Any]] = []
    for task in active_tasks:
        blind_spots.extend(task.get("coverage", {}).get("blind_spots", []))
    material_blind = any(item.get("material", True) for item in blind_spots)

    confirmed: list[dict[str, Any]] = []
    stale_findings: list[str] = []
    pending_verifier: list[str] = []
    for path in finding_files(session_dir):
        finding = read_json(path)
        if (
            finding.get("state") == "candidate"
            and finding.get("verification", {}).get("required")
            and finding.get("verification", {}).get("status") == "pending"
        ):
            pending_verifier.append(finding.get("id", path.stem))
        if finding.get("state") == "confirmed":
            if finding_is_fresh(repo, finding):
                confirmed.append(finding)
            else:
                stale_findings.append(finding["id"])
    if pending_verifier or stale_findings:
        complete = False
    completion_status = "complete" if complete else "partial"
    assurance = "limited" if material_blind else "full"
    clean = complete and not confirmed and not material_blind
    if clean:
        conclusion = "在当前范围和 OCR 规则下，没有发现已确认问题。"
    elif not complete:
        conclusion = "审查尚未完整结束，不能给出 clean 结论。"
    elif material_blind:
        conclusion = "审查任务已完成，但存在实质性覆盖限制，不能给出 clean 结论。"
    else:
        conclusion = f"审查完成，共发现 {len(confirmed)} 个已确认问题。"

    public_findings = []
    for finding in sorted(
        confirmed,
        key=lambda item: (
            ["critical", "high", "medium", "low"].index(item["severity"]),
            item["location"]["path"],
            item["location"]["start_line"],
        ),
    ):
        public_findings.append(
            {
                "id": finding["id"], "task_id": finding["task_id"], "title": finding["title"],
                "claim": finding["claim"], "severity": finding["severity"], "category": finding["category"],
                "expected": finding["expected"], "actual": finding["actual"], "impact": finding["impact"],
                "delivery_impact": finding.get("delivery_impact"),
                "evidence": finding["evidence"], "location": finding["location"], "xref": finding.get("xref", []),
            }
        )
    result = {
        "schema_version": SCHEMA_VERSION,
        "session_id": session_json["session_id"],
        "mode": session_json["mode"],
        "profile": session_json["profile"],
        "completion_status": completion_status,
        "assurance": assurance,
        "clean": clean,
        "conclusion": conclusion,
        "findings": public_findings,
        "blind_spots": blind_spots,
        "pending_verifier": pending_verifier,
        "stale_findings": stale_findings,
        "stale_tasks": stale_tasks,
        "coverage": {
            "total_tasks": len(manifest["tasks"]),
            "active_tasks": len(active_tasks),
            "removed_tasks": len(manifest["tasks"]) - len(active_tasks),
            "complete_tasks": sum(task["status"] == "complete" for task in active_tasks),
        },
        "generated_at": now(),
    }
    atomic_json(session_dir / "result.json", result)
    atomic_text(session_dir / "result.md", render_markdown(result))
    session_json["status"] = completion_status
    session_json["assurance"] = assurance
    save_session(session_dir, session_json, manifest)
    return {
        "completion_status": completion_status,
        "clean": clean,
        "result_json": str(session_dir / "result.json"),
        "result_markdown": str(session_dir / "result.md"),
    }


def add_session_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--session", required=True, help="Session directory returned by init")


def build_parser() -> argparse.ArgumentParser:
    parser = JsonArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="Create a review or scan session")
    init.add_argument("--repo", default=".")
    init.add_argument("--mode", choices=["review", "scan"], required=True)
    init.add_argument("--base")
    init.add_argument("--head", default="HEAD")
    init.add_argument("--workspace", action="store_true", help="Review current tracked and untracked workspace changes since --base")
    init.add_argument("--profile", choices=["correctness", "production-readiness"], default="correctness")
    init.add_argument("--rule")
    init.add_argument("--requirement", default="")
    init.add_argument("--session-id")
    init.add_argument("--state-root")
    init.add_argument("--concurrency", default="auto")
    init.add_argument("--segment-threshold", type=int, default=256 * 1024)
    init.set_defaults(func=cmd_init)

    start = sub.add_parser("task-start", help="Mark one Primary Target task running")
    add_session_argument(start)
    start.add_argument("--task", required=True)
    start.set_defaults(func=cmd_task_start)

    plan = sub.add_parser("task-plan", help="Attach signal-routed review dimensions to one task")
    add_session_argument(plan)
    plan.add_argument("--task", required=True)
    plan.add_argument("--input", required=True)
    plan.set_defaults(func=cmd_task_plan)

    submit = sub.add_parser("submit", help="Validate and store one model-proposed Finding")
    add_session_argument(submit)
    submit.add_argument("--task", required=True)
    submit.add_argument("--input", required=True)
    submit.set_defaults(func=cmd_submit)

    verify = sub.add_parser("verify", help="Record an independent verifier decision")
    add_session_argument(verify)
    verify.add_argument("--finding", required=True)
    verify.add_argument("--decision", choices=["confirm", "reject"], required=True)
    verify.add_argument("--reason", required=True)
    verify.set_defaults(func=cmd_verify)

    checkpoint = sub.add_parser("checkpoint", help="Save continuation state for a large or interrupted task")
    add_session_argument(checkpoint)
    checkpoint.add_argument("--task", required=True)
    checkpoint.add_argument("--input", required=True)
    checkpoint.set_defaults(func=cmd_checkpoint)

    complete = sub.add_parser("complete", help="Equivalent of OCR task_done with coverage gates")
    add_session_argument(complete)
    complete.add_argument("--task", required=True)
    complete.add_argument("--coverage", required=True)
    complete.set_defaults(func=cmd_complete)

    card = sub.add_parser("stack-card", help="Store the enriched repository capability profile")
    add_session_argument(card)
    card.add_argument("--input", required=True)
    card.set_defaults(func=cmd_stack_card)

    resume = sub.add_parser("resume", help="Revalidate task fingerprints and recover interrupted work")
    add_session_argument(resume)
    resume.add_argument("--rule")
    resume.set_defaults(func=cmd_resume)

    status = sub.add_parser("status", help="Show machine-owned lifecycle state")
    add_session_argument(status)
    status.set_defaults(func=cmd_status)

    finalize = sub.add_parser("finalize", help="Freshness-check and render authoritative output")
    add_session_argument(finalize)
    finalize.set_defaults(func=cmd_finalize)
    return parser


def main() -> int:
    parser = build_parser()
    try:
        args = parser.parse_args()
        if args.command in {
            "task-start", "task-plan", "submit", "verify", "checkpoint", "complete",
            "stack-card", "resume", "finalize",
        }:
            with session_lock(Path(args.session).resolve()):
                result = args.func(args)
        else:
            result = args.func(args)
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except ReviewError as exc:
        print(json.dumps(exc.payload, ensure_ascii=False, sort_keys=True), file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print(json.dumps({"error": "INTERRUPTED", "message": "Interrupted", "next_action": "resume"}), file=sys.stderr)
        return 130
    except Exception as exc:  # Defensive JSON-only CLI boundary.
        print(
            json.dumps(
                {
                    "error": "INTERNAL_ERROR",
                    "message": f"{type(exc).__name__}: {exc}",
                    "next_action": "inspect_error",
                },
                ensure_ascii=False,
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
