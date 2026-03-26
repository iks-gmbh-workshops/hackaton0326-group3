import { describe, expect, it } from "vitest";
import {
  currentUser,
  mockActivities,
  mockGroups,
  mockNotifications,
} from "./mock-data";

describe("mock-data", () => {
  it("contains a current user", () => {
    expect(currentUser.id).toBeTruthy();
    expect(currentUser.email).toContain("@");
  });

  it("contains groups with members", () => {
    expect(mockGroups.length).toBeGreaterThan(0);
    for (const group of mockGroups) {
      expect(group.id).toBeTruthy();
      expect(group.members.length).toBeGreaterThan(0);
    }
  });

  it("contains activities linked to groups", () => {
    const groupIds = new Set(mockGroups.map((group) => group.id));
    expect(mockActivities.length).toBeGreaterThan(0);
    for (const activity of mockActivities) {
      expect(groupIds.has(activity.groupId)).toBe(true);
      expect(activity.participants.length).toBeGreaterThan(0);
    }
  });

  it("contains typed notifications", () => {
    expect(mockNotifications.length).toBeGreaterThan(0);
    for (const notification of mockNotifications) {
      expect(notification.id).toBeTruthy();
      expect(notification.title).toBeTruthy();
      expect(notification.message).toBeTruthy();
    }
  });
});
