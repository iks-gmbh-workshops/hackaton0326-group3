package com.iks.backend.activity;

public class ActivityNotFoundException extends RuntimeException {

  public ActivityNotFoundException(String activityId) {
    super("Activity not found: " + activityId);
  }
}
