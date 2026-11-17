"""merge_is_active_and_learning_paths

Revision ID: 70cd16a358b1
Revises: add_user_is_active, e5f6a7b8c9d0
Create Date: 2026-11-05 09:56:32.357932

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '70cd16a358b1'
down_revision: Union[str, None] = ('add_user_is_active', 'e5f6a7b8c9d0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
