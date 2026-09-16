"""add coupons

Revision ID: a1b2c3d4e5f6
Revises: f3a1b2c4d5e6
Create Date: 2026-09-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f3a1b2c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # coupons table and payments.coupon_id already present in initial schema; skip
    pass


def downgrade() -> None:
    pass
