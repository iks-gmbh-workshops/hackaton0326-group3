"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getActivity,
  isActivityApiError,
  type BackendActivity,
} from "@/lib/activity-api";
import { getGroup, type BackendGroup } from "@/lib/group-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CalendarDays, Clock, MapPin, FileText } from "lucide-react";

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  const { id: groupId, activityId } = use(params);
  const { isLoggedIn, isLoading, accessToken } = useAuth();
  const [activity, setActivity] = useState<BackendActivity | null>(null);
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [loadedActivity, loadedGroup] = await Promise.all([
          getActivity(accessToken, groupId, activityId),
          getGroup(accessToken, groupId),
        ]);
        if (!cancelled) {
          setActivity(loadedActivity);
          setGroup(loadedGroup);
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
    </div>
  );
}
