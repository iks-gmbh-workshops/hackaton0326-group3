CREATE TABLE IF NOT EXISTS activity (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2000),
    scheduled_at TIMESTAMP NOT NULL,
    location VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_group FOREIGN KEY (group_id) REFERENCES app_group(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_group_id ON activity(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_scheduled_at ON activity(scheduled_at);
