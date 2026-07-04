from app.datasources.dialects.elasticsearch import ElasticsearchConnector
from app.datasources.dialects.mysql import MysqlConnector
from app.datasources.dialects.postgres import PostgresConnector
from app.datasources.dialects.starrocks import StarrocksConnector
from app.datasources.dialects.tidb import TidbConnector
from app.datasources.registry import register_dialect


def register_builtin_dialects() -> None:
    register_dialect(MysqlConnector())
    register_dialect(PostgresConnector())
    register_dialect(TidbConnector())
    register_dialect(StarrocksConnector())
    register_dialect(ElasticsearchConnector())


register_builtin_dialects()
