"""Run vs-ai-spec tools as subprocess with integration env."""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from config import apply_env, load_config, spec_pack_path


@dataclass
class ToolResult:
    returncode: int
    stdout: str
    stderr: str

    @property
    def ok(self) -> bool:
        return self.returncode == 0


def run_tool(script: str, *args: str, cwd: Path | None = None) -> ToolResult:
    pack = spec_pack_path()
    cfg = load_config()
    env = apply_env(cfg)
    cmd = [sys.executable, str(pack / "tools" / script), *args]
    proc = subprocess.run(
        cmd,
        cwd=str(cwd or pack),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    return ToolResult(proc.returncode, proc.stdout, proc.stderr)
