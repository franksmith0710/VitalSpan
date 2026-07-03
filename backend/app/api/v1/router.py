from fastapi import APIRouter

from app.api.v1.audit import router as audit_router
from app.api.v1.datasources import router as datasources_router
from app.api.v1.query import router as query_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.me import router as me_router
from app.api.v1.orgs import router as orgs_router
from app.api.v1.resource_grants import router as resource_grants_router
from app.api.v1.rls import router as rls_router
from app.api.v1.roles import router as roles_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter()
api_v1_router.include_router(me_router)
api_v1_router.include_router(ingestion_router)
api_v1_router.include_router(datasources_router)
api_v1_router.include_router(query_router)
api_v1_router.include_router(roles_router)
api_v1_router.include_router(orgs_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(resource_grants_router)
api_v1_router.include_router(rls_router)
api_v1_router.include_router(audit_router)
