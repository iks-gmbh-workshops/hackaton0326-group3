package com.iks.backend.activity.api;

import java.time.Instant;

public record AttendanceResponse(
    String id,
    String activityId,
    String userId,
    String userName,
    String userEmail,
    String status,
    Instant createdAt,
    Instant updatedAt
) {
}
