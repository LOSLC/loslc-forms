"""Add position to fields

Revision ID: 1808e811998e
Revises: 587b8b93effc
Create Date: 2025-07-02 19:14:44.014953

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '1808e811998e'
down_revision: Union[str, None] = '587b8b93effc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('formfield', sa.Column('position', sa.Integer(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('formfield', 'position')
    # ### end Alembic commands ###
