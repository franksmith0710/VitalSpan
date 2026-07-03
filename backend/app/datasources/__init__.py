from app.datasources.dialects.mysql import MysqlConnector
from app.datasources.dialects.postgres import PostgresConnector
from app.datasources.registry import register_dialect


def register_builtin_dialects() -> None:
    register_dialect(MysqlConnector())
    register_dialect(PostgresConnector())


register_builtin_dialects()
