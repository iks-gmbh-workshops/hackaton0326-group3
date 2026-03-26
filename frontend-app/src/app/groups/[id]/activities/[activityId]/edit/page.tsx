"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getGroup, isGroupApiError, type BackendGroup } from "@/lib/group-api";
import { getActivity, updateActivity, isActivityApiError, type BackendActivity } from "@/lib/activity-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  const { id: groupId, activityId } = use(params);
  const router = useRouter();
  const { user, isLoggedIn, isLoading, accessToken } = useAuth();
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [activity, setActivity] = useState<BackendActivity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [loadedGroup, loadedActivity] = await Promise.all([
          getGroup(accessToken, groupId),
          getActivity(accessToken, groupId, activityId),
        ]);
        if (!cancelled) {
          setGroup(loadedGroup);
          setActivity(loadedActivity);
          
          const scheduledDate = new Date(loadedActivity.scheduledAt);
          const dateStr = scheduledDate.toISOString().split('T')[0];
          const timeStr = scheduledDate.toTimeString().slice(0, 5);
          
          setTitle(loadedActivity.title);
          setDescription(loadedActivity.description || "");
          setDate(dateStr);
          setTime(timeStr);
          setLocation(loadedActivity.location || "");
          setLoadError(null);
          setNotFound(false);
        }
      } catch (error) {
        if (!cancelled) {
          setGroup(null);
          setActivity(null);
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
        <p className="text-muted-foreground">Please log in to edit activities.</p>
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

  if (!group || !activity) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (user?.id !== group.ownerId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-destructive">Only the group owner can edit activities.</p>
      </div>
    );
  }

  const isPast = new Date(activity.scheduledAt) < new Date();
  if (isPast) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-destructive">This activity has already occurred and cannot be edited.</p>
      </div>
    );
  }

  const validateDateTime = (dateValue: string, timeValue: string): string | null => {
    if (!dateValue || !timeValue) return null;

    try {
      const selectedDate = new Date(`${dateValue}T${timeValue}`);
      
      if (isNaN(selectedDate.getTime())) {
        return "Invalid date or time. Please check that the date exists (e.g., February only has 28/29 days).";
      }

      const now = new Date();
      if (selectedDate < now) {
        return "Activity cannot be scheduled in the past.";
      }

      return null;
    } catch {
      return "Invalid date or time format.";
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const validationError = validateDateTime(newDate, time);
    setDateError(validationError);
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    const validationError = validateDateTime(date, newTime);
    setDateError(validationError);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;
    if (!accessToken) {
      setError("You must be logged in to edit an activity.");
      return;
    }

    const validationError = validateDateTime(date, time);
    if (validationError) {
      setDateError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setDateError(null);
    try {
      await updateActivity(
        accessToken,
        groupId,
        activityId,
        title.trim(),
        description.trim() || undefined,
        date,
        time,
        location.trim() || undefined
      );
      router.push(`/groups/${groupId}/activities/${activityId}`);
    } catch (apiError) {
      if (isActivityApiError(apiError)) {
        setError(apiError.message);
      } else {
        setError("Failed to update activity. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link
        href={`/groups/${groupId}/activities/${activityId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to Activity
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Mountain Trail Hike"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What should participants know?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  ref={dateInputRef}
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker();
                    } catch (e) {
                      dateInputRef.current?.focus();
                    }
                  }}
                  className={dateError ? "border-destructive" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  required
                  className={dateError ? "border-destructive" : ""}
                />
              </div>
            </div>
            {dateError && (
              <p className="text-sm text-destructive">{dateError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="e.g. City Park Entrance"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting || !title.trim() || !date || !time || !!dateError}>
                {submitting ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/groups/${groupId}/activities/${activityId}`)}
              >
                Cancel
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
