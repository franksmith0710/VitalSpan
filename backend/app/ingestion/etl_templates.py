"""同步任务内置 ETL 演示模板。"""

from __future__ import annotations

DIRTY_ORDERS_DEMO_SOURCE_TABLE = "dirty_orders"

DIRTY_ORDERS_DEMO_ETL_RULES: list[dict[str, str]] = [
    {"type": "cast_type", "column": "amount", "to": "float"},
    {"type": "filter_rows", "column": "status", "op": "ne", "value": "deleted"},
]
