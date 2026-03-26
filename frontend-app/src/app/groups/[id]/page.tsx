"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  removeMemberFromGroup,
  leaveGroup,
  deleteGroup,
  getGroup,
  getGroupMembers,
  isGroupApiError,
  type BackendGroup,
  type GroupMember,
} from "@/lib/group-api";
import { listGroupActivities, type BackendActivity } from "@/lib/activity-api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, MapPin, Plus, UserPlus, ArrowLeft, Users, UserMinus, Pencil, Trash2, LogOut, ChevronDown, ChevronUp, Archive } from "lucide-react";

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
  const router = useRouter();
  const { user, isLoggedIn, isLoading, accessToken } = useAuth();
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [activities, setActivities] = useState<BackendActivity[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      return;
    }

    let cancelled = false;

    const loadGroup = async () => {
      try {
        const [loadedGroup, loadedMembers, loadedActivities] = await Promise.all([
          getGroup(accessToken, id),
          getGroupMembers(accessToken, id),
          listGroupActivities(accessToken, id),
        ]);
        if (!cancelled) {
          setGroup(loadedGroup);
          setMembers(loadedMembers);
          setActivities(loadedActivities);
          setLoadError(null);
          setMemberActionError(null);
          setNotFound(false);
        }
      } catch (error) {
        if (!cancelled) {
          setGroup(null);
          setMembers(null);
          setActivities(null);
          if (isGroupApiError(error) && error.status === 404) {
            setNotFound(true);
            setLoadError(null);
          } else {
            setNotFound(false);
            setLoadError(
              isGroupApiError(error) ? error.message : "Failed to load group."
            );
          }
        }
      }
    };

    void loadGroup();

    return () => {
      cancelled = true;
    };
  }, [id, isLoggedIn, accessToken]);

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
        <p className="text-muted-foreground">Please log in to view groups.</p>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Missing access token. Please log in again.</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading group...</p>
      </div>
    );
  }

  const isOwner = user?.id === group.ownerId;

  const handleDeleteGroup = () => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    void (async () => {
      if (!accessToken) return;
      setDeleting(true);
      try {
        await deleteGroup(accessToken, id);
        router.push("/dashboard");
      } catch (error) {
        setMemberActionError(
          isGroupApiError(error) ? error.message : "Failed to delete group."
        );
        setDeleting(false);
      }
    })();
  };

  const memberCount = members?.length ?? 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentActivities = activities?.filter((activity) => {
    const activityDate = new Date(activity.scheduledAt);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate >= today;
  }) ?? [];
  
  const archivedActivities = activities?.filter((activity) => {
    const activityDate = new Date(activity.scheduledAt);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate < today;
  }) ?? [];
  
  const activityCount = currentActivities.length;
  const archivedCount = archivedActivities.length;

  const handleLeaveGroup = () => {
    if (!confirm("Are you sure you want to leave this group?")) {
      return;
    }

    void (async () => {
      if (!accessToken) {
        setMemberActionError("Missing access token. Please log in again.");
        return;
      }

      setMemberActionError(null);
      setLeaving(true);
      try {
        await leaveGroup(accessToken, id);
        router.push("/dashboard");
      } catch (error) {
        setMemberActionError(
          isGroupApiError(error) ? error.message : "Failed to leave group."
        );
        setLeaving(false);
      }
    })();
  };

  const handleRemoveMember = (memberId: string) => {
    void (async () => {
      if (!accessToken) {
        setMemberActionError("Missing access token. Please log in again.");
        return;
      }

      setMemberActionError(null);
      setRemovingMemberId(memberId);
      try {
        await removeMemberFromGroup(accessToken, id, memberId);
        setMembers((previous) =>
          previous ? previous.filter((member) => member.id !== memberId) : previous
        );
      } catch (error) {
        setMemberActionError(
          isGroupApiError(error) ? error.message : "Failed to remove member from group."
        );
      } finally {
        setRemovingMemberId(null);
      }
    })();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to Dashboard
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <Badge variant="secondary" className="text-xs">
              Group
            </Badge>
          </div>
          {group.description && (
            <p className="mt-1 text-muted-foreground">{group.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteGroup}
            >
              <Trash2 className="mr-1 size-4" />
              {deleting ? "Deleting..." : "Delete Group"}
            </Button>
          )}
          {!isOwner && (
            <Button
              variant="outline"
              size="sm"
              disabled={leaving}
              onClick={handleLeaveGroup}
            >
              <LogOut className="mr-1 size-4" />
              {leaving ? "Leaving..." : "Leave Group"}
            </Button>
          )}
          {isOwner && (
            <>
              <Link
                href={`/groups/${group.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Pencil className="mr-1 size-4" />
                Edit Group
              </Link>
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
            </>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Users className="size-4" />
            Members ({memberCount})
          </h2>
          {memberActionError && (
            <p className="mb-3 text-sm text-destructive">{memberActionError}</p>
          )}
          {members === null ? (
            <Card>
              <CardContent className="py-5 text-sm text-muted-foreground">
                Loading members...
              </CardContent>
            </Card>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="py-5 text-sm text-muted-foreground">
                No members in this group yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.name}
                      {member.id === group.ownerId && (
                        <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">
                          Owner
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  {isOwner && member.id !== group.ownerId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={removingMemberId === member.id}
                      onClick={() => {
                        handleRemoveMember(member.id);
                      }}
                      title="Remove member"
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {isOwner && (
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

        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="size-4" />
            Activities ({activityCount})
          </h2>
          {activities === null ? (
            <Card>
              <CardContent className="py-5 text-sm text-muted-foreground">
                Loading activities...
              </CardContent>
            </Card>
          ) : currentActivities.length === 0 && archivedActivities.length === 0 ? (
            <Card>
              <CardContent className="py-5 text-sm text-muted-foreground">
                No activities yet.
              </CardContent>
            </Card>
          ) : (
            <>
              {currentActivities.length === 0 ? (
                <Card>
                  <CardContent className="py-5 text-sm text-muted-foreground">
                    No upcoming activities.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {currentActivities.map((activity) => {
                    const scheduledDate = new Date(activity.scheduledAt);
                    const dateStr = scheduledDate.toLocaleDateString();
                    const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <Link key={activity.id} href={`/groups/${id}/activities/${activity.id}`}>
                        <Card className="transition-colors hover:border-primary/40">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              {activity.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {activity.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="size-3" />
                                {dateStr}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {timeStr}
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

              {archivedActivities.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setArchiveOpen(!archiveOpen)}
                    className="mb-3 flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <Archive className="size-4" />
                      Archive ({archivedCount})
                    </h3>
                    {archiveOpen ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>

                  {archiveOpen && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {archivedActivities.map((activity) => {
                        const scheduledDate = new Date(activity.scheduledAt);
                        const dateStr = scheduledDate.toLocaleDateString();
                        const timeStr = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                          <Link key={activity.id} href={`/groups/${id}/activities/${activity.id}`}>
                            <Card className="opacity-60 transition-all hover:opacity-100 hover:border-primary/40">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                  {activity.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {activity.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {activity.description}
                                  </p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="size-3" />
                                    {dateStr}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {timeStr}
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
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
