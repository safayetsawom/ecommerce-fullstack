"""add variant system

Revision ID: f8cc542b02b1
Revises: 702d85a23e58
Create Date: 2026-10-17

Converts single-stock products into variant-based products while preserving
existing data:

  1. Create the new tables (product_options, product_option_values,
     product_variants, product_variant_option_values).
  2. For every existing product, create one default variant that inherits
     the product's current stock.
  3. Repoint every existing cart item and order item to that default variant.
  4. Drop the old `cart_items.product_id` and `products.stock` columns.
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8cc542b02b1'
down_revision: Union[str, Sequence[str], None] = '702d85a23e58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. Create new tables ---

    op.create_table(
        'product_options',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_product_options_id', 'product_options', ['id'])
    op.create_index('ix_product_options_product_id', 'product_options', ['product_id'])

    op.create_table(
        'product_option_values',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('option_id', sa.Integer(), nullable=False),
        sa.Column('value', sa.String(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['option_id'], ['product_options.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_product_option_values_id', 'product_option_values', ['id'])
    op.create_index('ix_product_option_values_option_id', 'product_option_values', ['option_id'])

    op.create_table(
        'product_variants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('stock', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_product_variants_id', 'product_variants', ['id'])
    op.create_index('ix_product_variants_product_id', 'product_variants', ['product_id'])

    op.create_table(
        'product_variant_option_values',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('variant_id', sa.Integer(), nullable=False),
        sa.Column('option_value_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['variant_id'], ['product_variants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['option_value_id'], ['product_option_values.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('variant_id', 'option_value_id', name='uq_variant_option_value'),
    )
    op.create_index('ix_product_variant_option_values_id', 'product_variant_option_values', ['id'])
    op.create_index('ix_product_variant_option_values_variant_id', 'product_variant_option_values', ['variant_id'])
    op.create_index('ix_product_variant_option_values_option_value_id', 'product_variant_option_values', ['option_value_id'])

    # --- 2. Add new columns as NULLABLE first (so existing rows survive) ---

    op.add_column('cart_items', sa.Column('variant_id', sa.Integer(), nullable=True))
    op.add_column('order_items', sa.Column('variant_id', sa.Integer(), nullable=True))
    op.add_column('order_items', sa.Column('options_text', sa.String(), nullable=True))

    # --- 3. Backfill: one default variant per existing product ---

    conn = op.get_bind()

    conn.execute(sa.text("""
        INSERT INTO product_variants (product_id, stock, is_active)
        SELECT id, stock, true
        FROM products
    """))

    conn.execute(sa.text("""
        UPDATE cart_items ci
        SET variant_id = pv.id
        FROM product_variants pv
        WHERE pv.product_id = ci.product_id
    """))

    conn.execute(sa.text("""
        UPDATE order_items oi
        SET variant_id = pv.id
        FROM product_variants pv
        WHERE pv.product_id = oi.product_id
    """))

    # --- 4. Tighten constraints now that data is safe ---

    op.alter_column('cart_items', 'variant_id', nullable=False)

    op.create_foreign_key(
        'cart_items_variant_id_fkey', 'cart_items', 'product_variants',
        ['variant_id'], ['id'], ondelete='CASCADE',
    )
    op.create_foreign_key(
        'order_items_variant_id_fkey', 'order_items', 'product_variants',
        ['variant_id'], ['id'],
    )

    op.create_index('ix_cart_items_variant_id', 'cart_items', ['variant_id'])

    # Swap old unique constraints for variant-based ones
    op.drop_constraint('uq_user_product_cart', 'cart_items', type_='unique')
    op.drop_constraint('uq_guest_product_cart', 'cart_items', type_='unique')
    op.create_unique_constraint('uq_user_variant_cart', 'cart_items', ['user_id', 'variant_id'])
    op.create_unique_constraint('uq_guest_variant_cart', 'cart_items', ['guest_token', 'variant_id'])

    # Drop old FK and column
    op.drop_constraint('cart_items_product_id_fkey', 'cart_items', type_='foreignkey')
    op.drop_column('cart_items', 'product_id')

    # --- 5. Finally, drop products.stock ---

    op.drop_column('products', 'stock')


def downgrade() -> None:
    op.add_column('products', sa.Column('stock', sa.Integer(), nullable=False, server_default='0'))

    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE products p
        SET stock = COALESCE((
            SELECT pv.stock FROM product_variants pv
            WHERE pv.product_id = p.id
            ORDER BY pv.id
            LIMIT 1
        ), 0)
    """))

    op.add_column('cart_items', sa.Column('product_id', sa.Integer(), nullable=True))
    conn.execute(sa.text("""
        UPDATE cart_items ci
        SET product_id = pv.product_id
        FROM product_variants pv
        WHERE pv.id = ci.variant_id
    """))
    op.alter_column('cart_items', 'product_id', nullable=False)
    op.create_foreign_key(
        'cart_items_product_id_fkey', 'cart_items', 'products',
        ['product_id'], ['id'], ondelete='CASCADE',
    )

    op.drop_constraint('uq_user_variant_cart', 'cart_items', type_='unique')
    op.drop_constraint('uq_guest_variant_cart', 'cart_items', type_='unique')
    op.create_unique_constraint('uq_user_product_cart', 'cart_items', ['user_id', 'product_id'])
    op.create_unique_constraint('uq_guest_product_cart', 'cart_items', ['guest_token', 'product_id'])

    op.drop_constraint('cart_items_variant_id_fkey', 'cart_items', type_='foreignkey')
    op.drop_index('ix_cart_items_variant_id', 'cart_items')
    op.drop_column('cart_items', 'variant_id')

    op.drop_constraint('order_items_variant_id_fkey', 'order_items', type_='foreignkey')
    op.drop_column('order_items', 'variant_id')
    op.drop_column('order_items', 'options_text')

    op.drop_table('product_variant_option_values')
    op.drop_table('product_variants')
    op.drop_table('product_option_values')
    op.drop_table('product_options')