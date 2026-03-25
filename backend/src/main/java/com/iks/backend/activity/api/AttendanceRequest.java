package com.iks.backend.activity.api;

public record AttendanceRequest(
    String status,
    String userName,
    String userEmail
) {
}
