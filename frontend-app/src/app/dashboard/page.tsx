"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { listMyGroups, type BackendGroup, isGroupApiError } from "@/lib/group-api";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

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
        const loadedGroups = await listMyGroups(accessToken);
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
  const ownedGroups = groups?.filter((g) => g.ownerId === user?.id) ?? [];
  const memberGroups = groups?.filter((g) => g.ownerId !== user?.id) ?? [];

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

      {loadError && <p className="mb-3 text-sm text-destructive">{loadError}</p>}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">My Groups</h2>
        {groups === null ? (
          <p className="text-sm text-muted-foreground">Loading groups...</p>
        ) : ownedGroups.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              You don&apos;t own any groups yet. Create your first group above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ownedGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        Owner
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {group.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No description</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Member Of</h2>
        {groups === null ? (
          <p className="text-sm text-muted-foreground">Loading groups...</p>
        ) : memberGroups.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              You&apos;re not a member of any other groups yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {memberGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        Member
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {group.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No description</p>
                    )}
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
