"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { mockActivities } from "@/lib/mock-data";
import type { RSVPStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Check,
  X,
  Users,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function statusBadgeVariant(status: RSVPStatus) {
  switch (status) {
    case "accepted":
      return "default" as const;
    case "declined":
      return "destructive" as const;
    case "maybe":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();

  const activity = mockActivities.find((a) => a.id === id);
  const [participants, setParticipants] = useState(
    activity?.participants ?? []
  );

  if (!activity) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Activity not found.</p>
      </div>
    );
  }

  const myParticipant = participants.find((p) => p.userId === user?.id);
  const isCreator = activity.createdBy === user?.id;
  const accepted = participants.filter((p) => p.status === "accepted").length;
  const maybe = participants.filter((p) => p.status === "maybe").length;
  const declined = participants.filter((p) => p.status === "declined").length;
  const pending = participants.filter((p) => p.status === "pending").length;

  const handleRSVP = (status: RSVPStatus) => {
    // TODO: call backend API to update RSVP
    setParticipants((prev) =>
      prev.map((p) =>
        p.userId === user?.id ? { ...p, status } : p
      )
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/groups/${activity.groupId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to {activity.groupName}
      </Link>

      {/* Activity header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activity.groupName}
            </p>
          </div>
          {myParticipant && (
            <Badge variant={statusBadgeVariant(myParticipant.status)} className="capitalize">
              {myParticipant.status}
            </Badge>
          )}
        </div>
        <p className="mt-3 text-muted-foreground">{activity.description}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {activity.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" />
            {activity.time}
          </span>
          {activity.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {activity.location}
            </span>
          )}
        </div>
      </div>

      {/* RSVP actions */}
      {myParticipant && (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm font-medium">Your RSVP</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={myParticipant.status === "accepted" ? "default" : "outline"}
                onClick={() => handleRSVP("accepted")}
              >
                <Check className="mr-1 size-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant={myParticipant.status === "maybe" ? "secondary" : "outline"}
                onClick={() => handleRSVP("maybe")}
              >
                Maybe
              </Button>
              <Button
                size="sm"
                variant={myParticipant.status === "declined" ? "destructive" : "outline"}
                onClick={() => handleRSVP("declined")}
              >
                <X className="mr-1 size-4" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="mb-6" />

      {/* Participants */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Users className="size-4" />
          Participants ({participants.length})
        </h2>

        {/* Stats */}
        <div className="mb-4 flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-primary" />
            {accepted} accepted
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-yellow-500" />
            {maybe} maybe
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-destructive" />
            {declined} declined
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-muted-foreground" />
            {pending} pending
          </span>
        </div>

        <div className="space-y-2">
          {participants.map((p) => (
            <div
              key={p.userId}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {getInitials(p.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {p.name}
                  {p.userId === user?.id && (
                    <span className="ml-1 text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{p.email}</p>
              </div>
              <Badge variant={statusBadgeVariant(p.status)} className="capitalize text-xs">
                {p.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
