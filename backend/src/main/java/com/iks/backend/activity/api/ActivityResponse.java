package com.iks.backend.activity.api;

import java.time.Instant;
import java.time.LocalDateTime;

public record ActivityResponse(
    String id,
    String groupId,
    String title,
    String description,
    LocalDateTime scheduledAt,
    String location,
    Instant createdAt,
    Instant updatedAt) {}
