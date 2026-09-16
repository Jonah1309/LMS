"""add_learning_paths

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learning_paths",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("price_usd", sa.Float(), nullable=True),
        sa.Column("price_inr", sa.Float(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_learning_paths_id"), "learning_paths", ["id"], unique=False)
    op.create_index(op.f("ix_learning_paths_slug"), "learning_paths", ["slug"], unique=True)

    op.create_table(
        "learning_path_courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("path_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.ForeignKeyConstraint(["path_id"], ["learning_paths.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_learning_path_courses_id"), "learning_path_courses", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_learning_path_courses_id"), table_name="learning_path_courses")
    op.drop_table("learning_path_courses")
    op.drop_index(op.f("ix_learning_paths_slug"), table_name="learning_paths")
    op.drop_index(op.f("ix_learning_paths_id"), table_name="learning_paths")
    op.drop_table("learning_paths")
