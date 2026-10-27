"""Shared router dependencies."""

from __future__ import annotations

import uuid
from typing import Annotated, TypeVar

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.session import get_db
from app import errors
from app.models import Company

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def get_company(
    company_id: Annotated[uuid.UUID, Path()],
    db: DbSession,
) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Company {company_id} not found"
        )
    return company


CurrentCompany = Annotated[Company, Depends(get_company)]


T = TypeVar("T")


def require(row: T | None, message: str) -> T:
    """404 for a stage that has not run yet, with the stage named."""
    if row is None:
        raise errors.AppError(errors.NOT_FOUND, message)
    return row
