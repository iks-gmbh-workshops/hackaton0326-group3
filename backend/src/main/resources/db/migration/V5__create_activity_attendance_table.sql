CREATE TABLE activity_attendance (
    id         VARCHAR(64)  NOT NULL PRIMARY KEY,
    activity_id VARCHAR(64) NOT NULL,
    user_id    VARCHAR(64)  NOT NULL,
    user_name  VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    status     VARCHAR(20)  NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_attendance_activity FOREIGN KEY (activity_id) REFERENCES activity (id) ON DELETE CASCADE,
    CONSTRAINT uq_activity_user UNIQUE (activity_id, user_id)
);
