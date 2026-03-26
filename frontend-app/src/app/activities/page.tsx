"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { listMyActivities, type UserActivity } from "@/lib/user-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "@/lib/locale-context";

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatMonthYear(year: number, month: number, locale: string): string {
  return new Date(year, month).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateTimeStr: string, locale: string): string {
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivitiesPage() {
  const { user, accessToken, isLoading, isLoggedIn } = useAuth();
  const t = useTranslations("activitiesCalendar");
  const tc = useTranslations("common");
  const { locale } = useLocale();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoadingActivities(false);
      return;
    }

    void (async () => {
      try {
        setLoadingActivities(true);
        setError(null);
        const data = await listMyActivities(accessToken);
        setActivities(data);
      } catch (err) {
        setError(t("failedToLoad"));
      } finally {
        setLoadingActivities(false);
      }
    })();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{tc("loading")}</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t("loginRequired")}</p>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthActivities = activities.filter((activity) => {
    const activityDate = new Date(activity.scheduledAt);
    return (
      activityDate.getFullYear() === currentYear &&
      activityDate.getMonth() === currentMonth
    );
  });

  const activitiesByDay: Record<number, UserActivity[]> = {};
  monthActivities.forEach((activity) => {
    const day = new Date(activity.scheduledAt).getDate();
    if (!activitiesByDay[day]) {
      activitiesByDay[day] = [];
    }
    activitiesByDay[day].push(activity);
  });

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-24 border border-border bg-muted/30" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayActivities = activitiesByDay[day] || [];
    const isToday =
      day === new Date().getDate() &&
      currentMonth === new Date().getMonth() &&
      currentYear === new Date().getFullYear();

    calendarDays.push(
      <div
        key={day}
        className={`min-h-24 border border-border p-2 ${isToday ? "bg-primary/5" : "bg-background"}`}
      >
        <div className={`mb-1 text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayActivities.map((activity) => {
            const isMaybe = activity.attendanceStatus === "MAYBE";
            return (
              <Link
                key={activity.id}
                href={`/groups/${activity.groupId}/activities/${activity.id}`}
                className={`block rounded px-2 py-1 text-xs ${
                  isMaybe
                    ? "border border-dashed border-primary/40 bg-primary/5 opacity-70 hover:bg-primary/10 hover:opacity-100"
                    : "bg-primary/10 hover:bg-primary/20"
                }`}
              >
                <div className="font-medium truncate">{activity.title}</div>
                <div className="text-muted-foreground">{formatTime(activity.scheduledAt, locale)}</div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="size-5" />
              {t("title")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-48 text-center font-semibold">
                {formatMonthYear(currentYear, currentMonth, locale)}
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">{error}</div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-px">
                {[t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")].map((day) => (
                  <div key={day} className="py-2 text-center text-sm font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border">{calendarDays}</div>
              {activities.length === 0 && (
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  {t("noActivities")}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
