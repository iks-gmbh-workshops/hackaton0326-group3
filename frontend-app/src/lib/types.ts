export type UserRole =
  | "anonymous"
  | "registered"
  | "group_member"
  | "activity_member"
  | "group_admin"
  | "system_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "admin" | "member";
  joinedAt: string;
}

export type RSVPStatus = "pending" | "accepted" | "declined" | "maybe";

export interface Activity {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
  createdBy: string;
  participants: Participant[];
}

export interface Participant {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: RSVPStatus;
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "activity_invite" | "group_invite" | "rsvp_update" | "reminder";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
