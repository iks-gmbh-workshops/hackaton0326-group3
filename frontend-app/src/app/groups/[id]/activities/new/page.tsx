"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getGroup, isGroupApiError, type BackendGroup } from "@/lib/group-api";
import { createActivity, isActivityApiError } from "@/lib/activity-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NewActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoggedIn, isLoading, accessToken } = useAuth();
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [groupNotFound, setGroupNotFound] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

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

    const loadGroup = async () => {
      try {
        const loadedGroup = await getGroup(accessToken, id);
        if (!cancelled) {
          setGroup(loadedGroup);
          setGroupNotFound(false);
          setGroupError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setGroup(null);
          if (isGroupApiError(error) && error.status === 404) {
            setGroupNotFound(true);
            setGroupError(null);
          } else {
            setGroupNotFound(false);
            setGroupError(
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
        <p className="text-muted-foreground">Please log in to create activities.</p>
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

  if (groupNotFound) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  if (groupError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-destructive">{groupError}</p>
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
      setError("You must be logged in to create an activity.");
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
      await createActivity(
        accessToken,
        id,
        title.trim(),
        description.trim() || undefined,
        date,
        time,
        location.trim() || undefined
      );
      router.push(`/groups/${id}`);
    } catch (apiError) {
      if (isActivityApiError(apiError)) {
        setError(apiError.message);
      } else {
        setError("Failed to create activity. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link
        href={`/groups/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to {group.name}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Activity for {group.name}</CardTitle>
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
                      // Fallback for browsers that don't support showPicker
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
                {submitting ? "Creating…" : "Create Activity"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/groups/${id}`)}
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
