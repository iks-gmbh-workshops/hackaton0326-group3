"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getActivity,
  isActivityApiError,
  listAttendees,
  respondToActivity,
  type BackendActivity,
  type BackendAttendance,
} from "@/lib/activity-api";
import { getGroup, type BackendGroup } from "@/lib/group-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  HelpCircle,
  Users,
} from "lucide-react";

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  const { id: groupId, activityId } = use(params);
  const { user, isLoggedIn, isLoading, accessToken } = useAuth();
  const [activity, setActivity] = useState<BackendActivity | null>(null);
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [attendees, setAttendees] = useState<BackendAttendance[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const loadAttendees = useCallback(async () => {
    if (!accessToken) return;
    try {
      const loaded = await listAttendees(accessToken, groupId, activityId);
      setAttendees(loaded);
    } catch {
      // silently ignore attendance load errors
    }
  }, [accessToken, groupId, activityId]);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [loadedActivity, loadedGroup, loadedAttendees] = await Promise.all([
          getActivity(accessToken, groupId, activityId),
          getGroup(accessToken, groupId),
          listAttendees(accessToken, groupId, activityId),
        ]);
        if (!cancelled) {
          setActivity(loadedActivity);
          setGroup(loadedGroup);
          setAttendees(loadedAttendees);
          setLoadError(null);
          setNotFound(false);
        }
      } catch (error) {
        if (!cancelled) {
          setActivity(null);
          setGroup(null);
          if (isActivityApiError(error) && error.status === 404) {
            setNotFound(true);
            setLoadError(null);
          } else {
            setNotFound(false);
            setLoadError(
              isActivityApiError(error) ? error.message : "Failed to load activity."
            );
          }
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [groupId, activityId, isLoggedIn, accessToken]);

  const handleRsvp = async (status: "ACCEPTED" | "DECLINED" | "MAYBE") => {
    if (!accessToken || !user) return;
    setRsvpLoading(true);
    setRsvpError(null);
    try {
      await respondToActivity(
        accessToken,
        groupId,
        activityId,
        status,
        user.name,
        user.email
      );
      await loadAttendees();
    } catch (error) {
      setRsvpError(
        isActivityApiError(error) ? error.message : "Failed to update attendance."
      );
    } finally {
      setRsvpLoading(false);
    }
  };

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
        <p className="text-muted-foreground">Please log in to view activities.</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Activity not found.</p>
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

  if (!activity) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  const scheduledDate = new Date(activity.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = scheduledDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPast = scheduledDate < new Date();
  const currentUserAttendance = user
    ? attendees.find((a) => a.userId === user.id)
    : undefined;
  const currentStatus = currentUserAttendance?.status ?? null;
  const acceptedAttendees = attendees.filter((a) => a.status === "ACCEPTED");
  const maybeAttendees = attendees.filter((a) => a.status === "MAYBE");
  const declinedAttendees = attendees.filter((a) => a.status === "DECLINED");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/groups/${groupId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to {group?.name ?? "Group"}
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
            {group && (
              <p className="mt-1 text-sm text-muted-foreground">{group.name}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            Activity
          </Badge>
        </div>
      </div>

      <Separator className="mb-6" />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-3 py-4">
            <CalendarDays className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-muted-foreground">{dateStr}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 py-4">
            <Clock className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Time</p>
              <p className="text-sm text-muted-foreground">{timeStr}</p>
            </div>
          </CardContent>
        </Card>

        {activity.location && (
          <Card className="sm:col-span-2">
            <CardContent className="flex items-start gap-3 py-4">
              <MapPin className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{activity.location}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {activity.description && (
        <>
          <Separator className="my-6" />
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <FileText className="size-4" />
              Description
            </h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {activity.description}
            </p>
          </section>
        </>
      )}

      <Separator className="my-6" />

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Users className="size-4" />
          Attendance
        </h2>

        {!isPast && (
          <div className="mb-6">
            <p className="mb-3 text-sm text-muted-foreground">
              {currentStatus
                ? `You have ${currentStatus === "ACCEPTED" ? "accepted" : currentStatus === "DECLINED" ? "declined" : "tentatively accepted"} this activity. You can change your response until the event starts.`
                : "Will you be attending this activity?"}
            </p>
            <div className="flex gap-3">
              <Button
                variant={currentStatus === "ACCEPTED" ? "default" : "outline"}
                size="sm"
                disabled={rsvpLoading}
                onClick={() => handleRsvp("ACCEPTED")}
              >
                <CheckCircle className="mr-1.5 size-4" />
                {currentStatus === "ACCEPTED" ? "Attending" : "Accept"}
              </Button>
              <Button
                variant={currentStatus === "MAYBE" ? "secondary" : "outline"}
                size="sm"
                disabled={rsvpLoading}
                onClick={() => handleRsvp("MAYBE")}
              >
                <HelpCircle className="mr-1.5 size-4" />
                {currentStatus === "MAYBE" ? "Maybe attending" : "Maybe"}
              </Button>
              <Button
                variant={currentStatus === "DECLINED" ? "destructive" : "outline"}
                size="sm"
                disabled={rsvpLoading}
                onClick={() => handleRsvp("DECLINED")}
              >
                <XCircle className="mr-1.5 size-4" />
                {currentStatus === "DECLINED" ? "Not attending" : "Decline"}
              </Button>
            </div>
            {rsvpError && (
              <p className="mt-2 text-sm text-destructive">{rsvpError}</p>
            )}
          </div>
        )}

        {isPast && (
          <p className="mb-4 text-sm text-muted-foreground">
            This activity has already started. Attendance can no longer be changed.
          </p>
        )}

        {acceptedAttendees.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
              Attending ({acceptedAttendees.length})
            </h3>
            <ul className="space-y-1">
              {acceptedAttendees.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="size-3.5 text-green-600 dark:text-green-400" />
                  <span>{a.userName}</span>
                  <span className="text-muted-foreground">({a.userEmail})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {maybeAttendees.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Maybe ({maybeAttendees.length})
            </h3>
            <ul className="space-y-1">
              {maybeAttendees.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <HelpCircle className="size-3.5 text-yellow-600 dark:text-yellow-400" />
                  <span>{a.userName}</span>
                  <span className="text-muted-foreground">({a.userEmail})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {declinedAttendees.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-red-700 dark:text-red-400">
              Not attending ({declinedAttendees.length})
            </h3>
            <ul className="space-y-1">
              {declinedAttendees.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <XCircle className="size-3.5 text-red-600 dark:text-red-400" />
                  <span>{a.userName}</span>
                  <span className="text-muted-foreground">({a.userEmail})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {attendees.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No one has responded yet.
          </p>
        )}
      </section>
    </div>
  );
}
