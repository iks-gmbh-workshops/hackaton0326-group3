package com.iks.backend.activity.api;

public record CreateActivityRequest(
    String title,
    String description,
    String date,
    String time,
    String location
) {
}
