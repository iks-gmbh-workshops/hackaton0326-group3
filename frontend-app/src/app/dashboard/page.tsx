"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { mockGroups, mockActivities } from "@/lib/mock-data";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, Plus, MapPin, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    );
  }

  const myGroups = mockGroups.filter((g) =>
    g.members.some((m) => m.userId === user?.id)
  );

  const upcomingActivities = mockActivities
    .filter((a) => myGroups.some((g) => g.id === a.groupId))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pendingRsvps = upcomingActivities.filter((a) =>
    a.participants.some((p) => p.userId === user?.id && p.status === "pending")
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground">
            {myGroups.length} group{myGroups.length !== 1 ? "s" : ""} · {upcomingActivities.length} upcoming activit{upcomingActivities.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Link href="/groups/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="mr-1 size-4" />
          New Group
        </Link>
      </div>

      {/* Pending RSVPs */}
      {pendingRsvps.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Pending RSVPs</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingRsvps.map((activity) => (
              <Link key={activity.id} href={`/activities/${activity.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{activity.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{activity.groupName}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" />
                        {activity.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {activity.time}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My Groups */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">My Groups</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myGroups.map((group) => {
            const isOwner = group.ownerId === user?.id;
            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                      {isOwner && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3" />
                      {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Upcoming Activities */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Upcoming Activities</h2>
        {upcomingActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming activities.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingActivities.map((activity) => {
              const myStatus = activity.participants.find(
                (p) => p.userId === user?.id
              )?.status;
              return (
                <Link key={activity.id} href={`/activities/${activity.id}`}>
                  <Card className="transition-colors hover:border-primary/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{activity.title}</CardTitle>
                        {myStatus && (
                          <Badge
                            variant={
                              myStatus === "accepted"
                                ? "default"
                                : myStatus === "declined"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {myStatus}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{activity.groupName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
