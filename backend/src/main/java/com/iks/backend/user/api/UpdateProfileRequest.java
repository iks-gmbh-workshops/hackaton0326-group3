package com.iks.backend.user.api;

public record UpdateProfileRequest(
    String firstName,
    String lastName,
    String email
) {
}
