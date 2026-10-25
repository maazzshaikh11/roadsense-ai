"""Initial tables."""
from alembic import op
import sqlalchemy as sa
revision = "0001"; down_revision = None; branch_labels = None; depends_on = None
def upgrade():
    op.create_table("dataset_info", sa.Column("id", sa.Integer, primary_key=True), sa.Column("name", sa.String(255)), sa.Column("author", sa.String(255)), sa.Column("source_url", sa.Text), sa.Column("coverage", sa.String(255)), sa.Column("license", sa.String(255)), sa.Column("total_records", sa.Integer, server_default="0"))
    op.create_table("hotspots", sa.Column("id", sa.Integer, primary_key=True), sa.Column("grid_lat", sa.Float), sa.Column("grid_lng", sa.Float), sa.Column("center_lat", sa.Float), sa.Column("center_lng", sa.Float), sa.Column("accident_count", sa.Integer), sa.Column("mean_severity", sa.Float), sa.Column("risk_score", sa.Float), sa.Column("risk_level", sa.String(32)), sa.Column("state", sa.String(64), server_default=""), sa.Column("city", sa.String(128), server_default=""))
    op.create_table("accident_records", sa.Column("id", sa.Integer, primary_key=True), sa.Column("severity", sa.Integer), sa.Column("start_time", sa.DateTime, nullable=True), sa.Column("latitude", sa.Float), sa.Column("longitude", sa.Float), sa.Column("city", sa.String(128), server_default=""), sa.Column("state", sa.String(64), server_default=""), sa.Column("weather_condition", sa.String(128), server_default=""))
def downgrade():
    op.drop_table("accident_records"); op.drop_table("hotspots"); op.drop_table("dataset_info")
