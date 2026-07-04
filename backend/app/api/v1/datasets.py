from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.metadata.dataset.errors import DatasetError
from app.metadata.dataset.schemas import DatasetItemIn, DatasetItemOut, DatasetListResponse, DatasetValidateOut
from app.metadata.dataset import service as dataset_service

router = APIRouter(prefix="/datasets", tags=["metadata", "META-004"])


def _dataset_error(exc: DatasetError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.get("", response_model=DatasetListResponse)
def list_datasets(
    _: Annotated[UserContext, Depends(get_current_user)],
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> DatasetListResponse:
    return dataset_service.list_datasets(limit, offset)


@router.post("", response_model=DatasetItemOut, status_code=status.HTTP_201_CREATED)
def create_dataset(
    payload: DatasetItemIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> DatasetItemOut | JSONResponse:
    try:
        return dataset_service.create_dataset(payload)
    except DatasetError as exc:
        return _dataset_error(exc)


@router.get("/{dataset_id}", response_model=DatasetItemOut)
def get_dataset(
    dataset_id: str,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> DatasetItemOut | JSONResponse:
    try:
        return dataset_service.get_dataset(dataset_id)
    except DatasetError as exc:
        return _dataset_error(exc)


@router.post("/validate", response_model=DatasetValidateOut)
def validate_dataset(
    payload: DatasetItemIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> DatasetValidateOut | JSONResponse:
    try:
        return dataset_service.validate_dataset_draft(payload)
    except DatasetError as exc:
        return _dataset_error(exc)
