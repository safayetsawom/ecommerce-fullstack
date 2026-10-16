"""add user phone, rename guest_phone to shipping_phone

Revision ID: 00669f065cd4
Revises: 73b19e0320c2
Create Date: 2026-10-14 03:48:22.820060

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00669f065cd4'
down_revision: Union[str, Sequence[str], None] = '73b19e0320c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))
    op.alter_column(
        'orders',
        'guest_phone',
        new_column_name='shipping_phone',
        existing_type=sa.String(),
        nullable=False,
    )

def downgrade() -> None:
    op.alter_column(
        'orders',
        'shipping_phone',
        new_column_name='guest_phone',
        existing_type=sa.String(),
        nullable=True,
    )
    op.drop_column('users', 'phone')