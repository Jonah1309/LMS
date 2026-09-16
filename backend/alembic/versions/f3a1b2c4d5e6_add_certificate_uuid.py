"""add certificate_uuid

Revision ID: f3a1b2c4d5e6
Revises: ac09cecc1caa
Create Date: 2026-09-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'f3a1b2c4d5e6'
down_revision = 'ac09cecc1caa'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # certificate_uuid already present in initial schema; skip
    pass


def downgrade() -> None:
    pass
