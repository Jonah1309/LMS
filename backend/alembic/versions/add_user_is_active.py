"""add user is_active

Revision ID: add_user_is_active
Revises: c668cdf4c961
Create Date: 2026-10-29
"""
import sqlalchemy as sa
from alembic import op

revision = 'add_user_is_active'
down_revision = 'f3a1b2c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')))


def downgrade():
    op.drop_column('users', 'is_active')
