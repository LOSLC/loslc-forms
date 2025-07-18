"""Better auth

Revision ID: aa7fe389d0a4
Revises: 1808e811998e
Create Date: 2025-07-07 11:55:14.713329

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'aa7fe389d0a4'
down_revision: Union[str, None] = '1808e811998e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('accountverificationsession',
    sa.Column('id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('token', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('tries', sa.Integer(), nullable=False),
    sa.Column('max_tries', sa.Integer(), nullable=False),
    sa.Column('expired', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id', 'token')
    )
    op.add_column('authsession', sa.Column('token', sqlmodel.sql.sqltypes.AutoString(), nullable=False))
    op.add_column('authsession', sa.Column('tries', sa.Integer(), server_default="0", nullable=False))
    op.add_column('authsession', sa.Column('max_tries', sa.Integer(),server_default="3", nullable=False))
    op.add_column('authsession', sa.Column('verified', sa.Boolean(),server_default="false", nullable=False))
    op.add_column('user', sa.Column('registered_at', sa.DateTime(),server_default=sa.func.now(), nullable=False))
    op.add_column('user', sa.Column('verified', sa.Boolean(),server_default="false", nullable=False))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('user', 'verified')
    op.drop_column('user', 'registered_at')
    op.drop_column('authsession', 'verified')
    op.drop_column('authsession', 'max_tries')
    op.drop_column('authsession', 'tries')
    op.drop_column('authsession', 'token')
    op.drop_table('accountverificationsession')
    # ### end Alembic commands ###
