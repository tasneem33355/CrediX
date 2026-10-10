"""User Pydantic Schemas."""

from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str
    name_en: str = Field(..., alias="nameEn")
    email: str
    role: str = "officer"  # 'client' | 'officer'
    officer_tier: Optional[str] = Field(None, alias="officerTier")
    approval_limit_egp: Optional[float] = Field(None, alias="approvalLimitEgp")
    can_override_policy: Optional[bool] = Field(False, alias="canOverridePolicy")
    avatar: Optional[str] = None
    title: Optional[str] = None
    title_en: Optional[str] = Field(None, alias="titleEn")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class UserCreate(UserBase):
    id: Optional[str] = None


class UserResponse(UserBase):
    id: str


class UserUpdatePermissions(BaseModel):
    role: Optional[str] = None
    officer_tier: Optional[str] = Field(None, alias="officerTier")
    approval_limit_egp: Optional[float] = Field(None, alias="approvalLimitEgp")
    can_override_policy: Optional[bool] = Field(None, alias="canOverridePolicy")
    title: Optional[str] = None
    title_en: Optional[str] = Field(None, alias="titleEn")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)



class LoginRequest(BaseModel):
    role: Optional[str] = "officer"
    email: Optional[str] = None
    password: Optional[str] = None

