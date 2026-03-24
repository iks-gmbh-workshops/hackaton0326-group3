import type {
  User,
  Group,
  Activity,
  Notification,
} from "./types";

export const currentUser: User = {
  id: "u1",
  name: "Max Mustermann",
  email: "max@example.com",
  avatarUrl: undefined,
  role: "registered",
};

export const mockGroups: Group[] = [
  {
    id: "g1",
    name: "Weekend Hikers",
    description: "A group for weekend hiking trips around the region.",
    ownerId: "u1",
    members: [
      {
        userId: "u1",
        name: "Max Mustermann",
        email: "max@example.com",
        role: "admin",
        joinedAt: "2025-01-15",
      },
      {
        userId: "u2",
        name: "Anna Schmidt",
        email: "anna@example.com",
        role: "member",
        joinedAt: "2025-02-01",
      },
      {
        userId: "u3",
        name: "Tom Weber",
        email: "tom@example.com",
        role: "member",
        joinedAt: "2025-02-10",
      },
    ],
    createdAt: "2025-01-15",
  },
  {
    id: "g2",
    name: "Board Game Night",
    description: "Monthly board game meetups at various locations.",
    ownerId: "u1",
    members: [
      {
        userId: "u1",
        name: "Max Mustermann",
        email: "max@example.com",
        role: "admin",
        joinedAt: "2025-03-01",
      },
      {
        userId: "u4",
        name: "Lisa Braun",
        email: "lisa@example.com",
        role: "member",
        joinedAt: "2025-03-05",
      },
    ],
    createdAt: "2025-03-01",
  },
  {
    id: "g3",
    name: "Running Club",
    description: "Weekly runs in the park, all fitness levels welcome.",
    ownerId: "u5",
    members: [
      {
        userId: "u5",
        name: "Julia Meier",
        email: "julia@example.com",
        role: "admin",
        joinedAt: "2025-01-01",
      },
      {
        userId: "u1",
        name: "Max Mustermann",
        email: "max@example.com",
        role: "member",
        joinedAt: "2025-01-20",
      },
    ],
    createdAt: "2025-01-01",
  },
];

export const mockActivities: Activity[] = [
  {
    id: "a1",
    groupId: "g1",
    groupName: "Weekend Hikers",
    title: "Mountain Trail Hike",
    description: "A moderate 12km hike through the mountain trails. Bring water and snacks.",
    date: "2026-04-05",
    time: "09:00",
    location: "Trailhead Parking, Bergweg 1",
    createdBy: "u1",
    participants: [
      { userId: "u1", name: "Max Mustermann", email: "max@example.com", status: "accepted" },
      { userId: "u2", name: "Anna Schmidt", email: "anna@example.com", status: "accepted" },
      { userId: "u3", name: "Tom Weber", email: "tom@example.com", status: "pending" },
    ],
  },
  {
    id: "a2",
    groupId: "g2",
    groupName: "Board Game Night",
    title: "April Game Night",
    description: "Bring your favorite board games! Snacks provided.",
    date: "2026-04-12",
    time: "19:00",
    location: "Lisa's place",
    createdBy: "u1",
    participants: [
      { userId: "u1", name: "Max Mustermann", email: "max@example.com", status: "accepted" },
      { userId: "u4", name: "Lisa Braun", email: "lisa@example.com", status: "pending" },
    ],
  },
  {
    id: "a3",
    groupId: "g3",
    groupName: "Running Club",
    title: "Saturday Morning Run",
    description: "Easy 5km jog around the lake.",
    date: "2026-04-06",
    time: "08:00",
    location: "City Park Entrance",
    createdBy: "u5",
    participants: [
      { userId: "u5", name: "Julia Meier", email: "julia@example.com", status: "accepted" },
      { userId: "u1", name: "Max Mustermann", email: "max@example.com", status: "pending" },
    ],
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "n1",
    type: "activity_invite",
    title: "New Activity",
    message: "You've been invited to 'Saturday Morning Run' in Running Club.",
    read: false,
    createdAt: "2026-03-24T10:00:00Z",
    link: "/activities/a3",
  },
  {
    id: "n2",
    type: "rsvp_update",
    title: "RSVP Update",
    message: "Anna Schmidt accepted 'Mountain Trail Hike'.",
    read: false,
    createdAt: "2026-03-23T14:30:00Z",
    link: "/activities/a1",
  },
  {
    id: "n3",
    type: "group_invite",
    title: "New Member Request",
    message: "Lukas Fischer wants to join Weekend Hikers.",
    read: true,
    createdAt: "2026-03-22T09:00:00Z",
    link: "/groups/g1",
  },
];
