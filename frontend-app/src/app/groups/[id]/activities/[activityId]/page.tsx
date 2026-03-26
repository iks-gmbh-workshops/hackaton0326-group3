"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getActivity,
  isActivityApiError,
  listAttendees,
  respondToActivity,
  deleteActivity,
  type BackendActivity,
  type BackendAttendance,
} from "@/lib/activity-api";
import { getGroup, type BackendGroup } from "@/lib/group-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/lib/locale-context";

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  const { id: groupId, activityId } = use(params);
  const router = useRouter();
  const { user, isLoggedIn, isLoading, accessToken } = useAuth();
  const t = useTranslations("activityDetail");
  const tc = useTranslations("common");
  const { locale } = useLocale();
  const [activity, setActivity] = useState<BackendActivity | null>(null);
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [attendees, setAttendees] = useState<BackendAttendance[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
              isActivityApiError(error) ? error.message : t("failedToLoad")
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
        isActivityApiError(error) ? error.message : t("failedToUpdateAttendance")
      );
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleDelete = () => {
    if (!confirm(t("confirmDelete"))) {
      return;
    }

    void (async () => {
      if (!accessToken) return;
      setDeleting(true);
      try {
        await deleteActivity(accessToken, groupId, activityId);
        router.push(`/groups/${groupId}`);
      } catch (error) {
        alert(
          isActivityApiError(error) ? error.message : t("failedToDelete")
        );
        setDeleting(false);
      }
    })();
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{tc("checkingAuth")}</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t("loginRequired")}</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t("activityNotFound")}</p>
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
        <p className="text-muted-foreground">{t("loadingActivity")}</p>
      </div>
    );
  }

  const scheduledDate = new Date(activity.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = scheduledDate.toLocaleTimeString(locale, {
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
        {t("backTo", { name: group?.name ?? tc("group") })}
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
            {group && (
              <p className="mt-1 text-sm text-muted-foreground">{group.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {tc("activity")}
            </Badge>
            {group && user?.id === group.ownerId && !isPast && (
              <>
                <Link
                  href={`/groups/${groupId}/activities/${activityId}/edit`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Pencil className="mr-1 size-4" />
                  {t("edit")}
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-1 size-4" />
                  {deleting ? tc("deleting") : tc("delete")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-3 py-4">
            <CalendarDays className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t("dateLabel")}</p>
              <p className="text-sm text-muted-foreground">{dateStr}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 py-4">
            <Clock className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t("timeLabel")}</p>
              <p className="text-sm text-muted-foreground">{timeStr}</p>
            </div>
          </CardContent>
        </Card>

        {activity.location && (
          <Card className="sm:col-span-2">
            <CardContent className="flex items-start gap-3 py-4">
              <MapPin className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("locationLabel")}</p>
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
              {t("descriptionLabel")}
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
          {t("attendance")}
        </h2>

        {!isPast && (
          <div className="mb-6">
            <p className="mb-3 text-sm text-muted-foreground">
              {currentStatus === "ACCEPTED"
                ? t("rsvpAccepted")
                : currentStatus === "DECLINED"
                  ? t("rsvpDeclined")
                  : currentStatus === "MAYBE"
                    ? t("rsvpMaybe")
                    : t("rsvpPrompt")}
            </p>
            <div className="flex gap-3">
              <Button
                variant={currentStatus === "ACCEPTED" ? "default" : "outline"}
                size="sm"
                disabled={rsvpLoading}
                onClick={() => handleRsvp("ACCEPTED")}
              >
                <CheckCircle className="mr-1.5 size-4" />
                {currentStatus === "ACCEPTED" ? t("attending") : t("accept")}
              </Button>
              <Button
                variant={currentStatus === "MAYBE" ? "secondary" : "outline"}
                size="sm"
                disabled={rsvpLoading}
                onClick={() => handleRsvp("MAYBE")}
              >
                <HelpCircle className="mr-1.5 size-4" />
                {currentStatus === "MAYBE" ? t("maybeAttending") : t("maybe")}
              </Button>
              <Button
                variant={currentStatus === "DECLINED" ? "destructive" : "outline"}
                size="sm"
                disabled={rsvpLoading}
                onClick={() => handleRsvp("DECLINED")}
              >
                <XCircle className="mr-1.5 size-4" />
                {currentStatus === "DECLINED" ? t("notAttending") : t("decline")}
              </Button>
            </div>
            {rsvpError && (
              <p className="mt-2 text-sm text-destructive">{rsvpError}</p>
            )}
          </div>
        )}

        {isPast && (
          <p className="mb-4 text-sm text-muted-foreground">
            {t("pastActivity")}
          </p>
        )}

        {acceptedAttendees.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
              {t("attending")} ({acceptedAttendees.length})
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
              {t("maybe")} ({maybeAttendees.length})
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
              {t("notAttending")} ({declinedAttendees.length})
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
            {t("noResponses")}
          </p>
        )}
      </section>
    </div>
  );
}
