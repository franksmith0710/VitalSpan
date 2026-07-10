"""Customer-delivery honesty gate (Phase0 scaffold + H1 nav).

Tracks fill in remaining assertions as they land. H1 gov-nav default-off is
covered primarily by FE vitest (`resolve-nav.test.ts` T-NAV-H1-*); this module
documents the gate contract for Phase M.
"""

from __future__ import annotations


def test_honesty_gate_h1_gov_nav_default_documented() -> None:
    """H1: 治理侧栏默认隐藏，除非 VITE_GOV_NAV=1（FE resolve-nav）。"""
    # Executable FE coverage: fe/src/lib/resolve-nav.test.ts
    # T-NAV-H1-01 / T-NAV-H1-02
    assert True
