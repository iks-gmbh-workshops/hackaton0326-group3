package com.iks.backend.user.api;

import java.time.Instant;
import java.time.LocalDateTime;

public record UserActivityResponse(
    String id,
    String groupId,
    String title,
    String description,
    LocalDateTime scheduledAt,
    String location,
    String attendanceStatus,
    Instant createdAt,
    Instant updatedAt) {}
