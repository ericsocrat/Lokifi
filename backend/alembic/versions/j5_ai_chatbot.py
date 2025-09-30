"""Add AI thread and message tables

Revision ID: j5_ai_chatbot
Revises: (current head)
Create Date: 2025-01-27 20:00:00.000000

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = 'j5_ai_chatbot'
down_revision = None  # Update this to the actual current head
branch_labels = None
depends_on = None


def upgrade():
    # Create AI threads table
    op.create_table('ai_threads',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('is_archived', sa.Boolean(), nullable=False, default=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_threads_id', 'ai_threads', ['id'])
    op.create_index('ix_ai_threads_user_id', 'ai_threads', ['user_id'])
    op.create_index('ix_ai_threads_user_updated', 'ai_threads', ['user_id', 'updated_at'])
    op.create_index('ix_ai_threads_user_created', 'ai_threads', ['user_id', 'created_at'])

    # Create AI messages table
    op.create_table('ai_messages',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('thread_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('provider', sa.String(length=50), nullable=True),
        sa.Column('token_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['thread_id'], ['ai_threads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_messages_id', 'ai_messages', ['id'])
    op.create_index('ix_ai_messages_thread_id', 'ai_messages', ['thread_id'])
    op.create_index('ix_ai_messages_role', 'ai_messages', ['role'])
    op.create_index('ix_ai_messages_thread_created', 'ai_messages', ['thread_id', 'created_at'])
    op.create_index('ix_ai_messages_role_created', 'ai_messages', ['role', 'created_at'])


def downgrade():
    # Drop AI messages table
    op.drop_index('ix_ai_messages_role_created', 'ai_messages')
    op.drop_index('ix_ai_messages_thread_created', 'ai_messages')
    op.drop_index('ix_ai_messages_role', 'ai_messages')
    op.drop_index('ix_ai_messages_thread_id', 'ai_messages')
    op.drop_index('ix_ai_messages_id', 'ai_messages')
    op.drop_table('ai_messages')

    # Drop AI threads table
    op.drop_index('ix_ai_threads_user_created', 'ai_threads')
    op.drop_index('ix_ai_threads_user_updated', 'ai_threads')
    op.drop_index('ix_ai_threads_user_id', 'ai_threads')
    op.drop_index('ix_ai_threads_id', 'ai_threads')
    op.drop_table('ai_threads')