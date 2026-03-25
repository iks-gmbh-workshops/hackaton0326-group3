"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  addMemberToGroup,
  getGroup,
  getGroupMembers,
  isGroupApiError,
  type BackendGroup,
  type GroupMember,
} from "@/lib/group-api";
import { isUserApiError, searchUsers, type DirectoryUser } from "@/lib/user-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Mail, UserPlus, X } from "lucide-react";

interface PendingMember {
  type: "registered" | "email";
  id?: string;
  name: string;
  email: string;
}

export default function AddMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoggedIn, isLoading, accessToken } = useAuth();
  const [group, setGroup] = useState<BackendGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupNotFound, setGroupNotFound] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [emailInvite, setEmailInvite] = useState("");
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<DirectoryUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      return;
    }

    let cancelled = false;

    const loadGroup = async () => {
      try {
        const [loadedGroup, loadedMembers] = await Promise.all([
          getGroup(accessToken, id),
          getGroupMembers(accessToken, id),
        ]);
        if (!cancelled) {
          setGroup(loadedGroup);
          setGroupMembers(loadedMembers);
          setGroupNotFound(false);
          setGroupError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setGroup(null);
          setGroupMembers([]);
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

  useEffect(() => {
    const query = search.trim();
    if (!accessToken || query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchingUsers(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const users = await searchUsers(accessToken, query);
        if (!cancelled) {
          setSearchResults(users);
          setSearchError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(
            isUserApiError(error) ? error.message : "Failed to search users."
          );
        }
      } finally {
        if (!cancelled) {
          setSearchingUsers(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [search, accessToken]);

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
        <p className="text-muted-foreground">Please log in to add members.</p>
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

  const existingMemberIds = new Set(groupMembers.map((member) => member.id));
  const pendingIds = new Set(pending.map((p) => p.id ?? p.email));
  const currentUserId = user?.id;

  const filteredUsers = searchResults.filter(
    (u) =>
      !existingMemberIds.has(u.id) &&
      (!currentUserId || u.id !== currentUserId) &&
      !pendingIds.has(u.id) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const addRegisteredUser = (user: DirectoryUser) => {
    setPending((prev) => [
      ...prev,
      { type: "registered", id: user.id, name: user.name, email: user.email },
    ]);
    setSearch("");
  };

  const addEmailInvite = () => {
    const email = emailInvite.trim();
    if (!email || !email.includes("@")) return;
    if (pendingIds.has(email)) return;

    setPending((prev) => [
      ...prev,
      { type: "email", name: email, email },
    ]);
    setEmailInvite("");
  };

  const removePending = (index: number) => {
    setPending((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    void (async () => {
      if (!accessToken) {
        setSubmitError("Missing access token. Please log in again.");
        return;
      }
      if (pending.length === 0) {
        setSubmitError("Select at least one member.");
        return;
      }

      const memberRequests = [
        ...new Map(
          pending.flatMap((member) => {
            if (member.type === "registered" && member.id) {
              return [[`user:${member.id}`, { userId: member.id }] as const];
            }
            if (member.type === "email") {
              return [[`email:${member.email.toLowerCase()}`, { email: member.email }] as const];
            }
            return [];
          })
        ).values(),
      ];

      if (memberRequests.length === 0) {
        setSubmitError("No valid members selected.");
        return;
      }

      setSubmitting(true);
      setSubmitError(null);
      setSubmitInfo(null);
      try {
        await Promise.all(
          memberRequests.map((request) => addMemberToGroup(accessToken, id, request))
        );
        router.push(`/groups/${id}`);
      } catch (error) {
        setSubmitting(false);
        setSubmitInfo(null);
        setSubmitError(
          isGroupApiError(error) ? error.message : "Failed to add members to the group."
        );
      }
    })();
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Members to {group.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search registered users */}
          <div className="space-y-2">
            <Label>Search Registered Users</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {search && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                {search.trim().length < 2 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Type at least 2 characters to search.
                  </p>
                ) : searchingUsers ? (
                  <p className="p-3 text-sm text-muted-foreground">Searching users...</p>
                ) : searchError ? (
                  <p className="p-3 text-sm text-destructive">{searchError}</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No users found.</p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => addRegisteredUser(u)}
                    >
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <UserPlus className="size-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Invite by email */}
          <div className="space-y-2">
            <Label>Invite by Email (unregistered users)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={emailInvite}
                  onChange={(e) => setEmailInvite(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEmailInvite();
                    }
                  }}
                />
              </div>
              <Button variant="outline" onClick={addEmailInvite}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending additions */}
      {pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              Members to Add ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pending.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge variant={p.type === "registered" ? "secondary" : "outline"} className="text-xs">
                      {p.type === "registered" ? "Registered" : "Email Invite"}
                    </Badge>
                  </div>
                  <button
                    onClick={() => removePending(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Adding…" : `Add ${pending.length} Member${pending.length !== 1 ? "s" : ""}`}
              </Button>
              <Button variant="outline" onClick={() => setPending([])}>
                Clear All
              </Button>
            </div>
            {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}
            {submitInfo && <p className="mt-3 text-sm text-muted-foreground">{submitInfo}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
