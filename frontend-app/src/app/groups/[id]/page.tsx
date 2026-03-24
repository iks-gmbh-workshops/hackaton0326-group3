"use client";

import { use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { mockGroups, mockActivities } from "@/lib/mock-data";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  UserPlus,
  Shield,
  ArrowLeft,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();

  const group = mockGroups.find((g) => g.id === id);

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  const isAdmin = group.ownerId === user?.id;
  const activities = mockActivities.filter((a) => a.groupId === group.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to Dashboard
      </Link>

      {/* Group header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{group.description}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href={`/groups/${group.id}/members/add`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <UserPlus className="mr-1 size-4" />
              Add Member
            </Link>
            <Link
              href={`/groups/${group.id}/activities/new`}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="mr-1 size-4" />
              New Activity
            </Link>
          </div>
        )}
      </div>

      <Separator className="mb-8" />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Members */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Users className="size-4" />
            Members ({group.members.length})
          </h2>
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                {member.role === "admin" && (
                  <Shield className="size-4 text-primary" />
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <Link
              href={`/groups/${group.id}/members/add`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "mt-3 w-full",
              })}
            >
              <UserPlus className="mr-1 size-4" />
              Add Member
            </Link>
          )}
        </section>

        {/* Activities */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-4" />
            Activities ({activities.length})
          </h2>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activities.map((activity) => {
                const accepted = activity.participants.filter(
                  (p) => p.status === "accepted"
                ).length;
                const total = activity.participants.length;

                return (
                  <Link key={activity.id} href={`/activities/${activity.id}`}>
                    <Card className="transition-colors hover:border-primary/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {activity.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {activity.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {activity.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {activity.time}
                          </span>
                          {activity.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {activity.location}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {accepted}/{total} accepted
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
