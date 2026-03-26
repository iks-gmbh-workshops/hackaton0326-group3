package com.iks.backend.activity.api;

public record UpdateActivityRequest(
    String title, String description, String date, String time, String location) {}
