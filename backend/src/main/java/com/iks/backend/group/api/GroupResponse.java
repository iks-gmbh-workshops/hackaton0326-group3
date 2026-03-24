package com.iks.backend.group.api;

import java.time.Instant;

public record GroupResponse(
    String id,
    String name,
    Instant createdAt,
    Instant updatedAt
) {
}
