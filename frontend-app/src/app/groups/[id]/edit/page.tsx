"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getGroup, updateGroup, isGroupApiError, type BackendGroup } from "@/lib/group-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoggedIn, isLoading, accessToken } = useAuth();
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

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
          setName(loadedGroup.name);
          setDescription(loadedGroup.description || "");
          setLoadError(null);
          setNotFound(false);
        }
      } catch (error) {
        if (!cancelled) {
          setGroup(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!accessToken) {
      setSubmitError("You must be logged in to edit a group.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateGroup(accessToken, id, name.trim(), description.trim() || undefined);
      router.push(`/groups/${id}`);
    } catch (apiError) {
      if (isGroupApiError(apiError)) {
        setSubmitError(apiError.message);
      } else {
        setSubmitError("Failed to update group. Please try again.");
      }
      setSubmitting(false);
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
        <p className="text-muted-foreground">Please log in to edit groups.</p>
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

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link
        href={`/groups/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Back to Group
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Group</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="e.g. Weekend Hikers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/groups/${id}`)}
              >
                Cancel
              </Button>
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
