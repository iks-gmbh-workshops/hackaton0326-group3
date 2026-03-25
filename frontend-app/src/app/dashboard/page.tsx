"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { listGroups, type BackendGroup, isGroupApiError } from "@/lib/group-api";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoggedIn, isLoading, accessToken } = useAuth();
  const [groups, setGroups] = useState<BackendGroup[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      return;
    }

    let cancelled = false;

    const loadGroups = async () => {
      try {
        const loadedGroups = await listGroups(accessToken);
        if (!cancelled) {
          setGroups(loadedGroups);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setGroups([]);
          setLoadError(
            isGroupApiError(error) ? error.message : "Failed to load groups."
          );
        }
      }
    };

    void loadGroups();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, accessToken]);

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

  if (!accessToken) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Missing access token. Please log in again.</p>
      </div>
    );
  }

  const greetingName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {greetingName}</h1>
          <p className="text-muted-foreground">
            {groups === null ? "Loading groups..." : `${groups.length} group${groups.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/groups/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="mr-1 size-4" />
          New Group
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Groups</h2>
        {loadError && <p className="mb-3 text-sm text-destructive">{loadError}</p>}
        {groups === null ? (
          <p className="text-sm text-muted-foreground">Loading groups...</p>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No groups yet. Create your first group.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        Group
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="size-3" />
                      ID: {group.id}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
