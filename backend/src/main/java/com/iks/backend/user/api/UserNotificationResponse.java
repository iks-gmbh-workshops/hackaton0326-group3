package com.iks.backend.user.api;

import java.time.Instant;

public record UserNotificationResponse(
    String id,
    String type,
    String title,
    String message,
    boolean read,
    Instant createdAt,
    String link) {}
