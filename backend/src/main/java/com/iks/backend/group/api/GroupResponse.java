package com.iks.backend.group.api;

import java.time.Instant;

public record GroupResponse(
    String id,
    String name,
    String description,
    String ownerId,
    Instant createdAt,
    Instant updatedAt) {}
