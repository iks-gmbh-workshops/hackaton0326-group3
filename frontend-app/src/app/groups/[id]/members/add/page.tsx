"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mockGroups } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Mail, UserPlus, X } from "lucide-react";

const registeredUsers = [
  { id: "u2", name: "Anna Schmidt", email: "anna@example.com" },
  { id: "u3", name: "Tom Weber", email: "tom@example.com" },
  { id: "u4", name: "Lisa Braun", email: "lisa@example.com" },
  { id: "u5", name: "Julia Meier", email: "julia@example.com" },
  { id: "u6", name: "Lukas Fischer", email: "lukas@example.com" },
];

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
  const group = mockGroups.find((g) => g.id === id);

  const [search, setSearch] = useState("");
  const [emailInvite, setEmailInvite] = useState("");
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  const existingMemberIds = new Set(group.members.map((m) => m.userId));
  const pendingIds = new Set(pending.map((p) => p.id ?? p.email));

  const filteredUsers = registeredUsers.filter(
    (u) =>
      !existingMemberIds.has(u.id) &&
      !pendingIds.has(u.id) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const addRegisteredUser = (user: (typeof registeredUsers)[0]) => {
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
    if (pending.length === 0) return;
    setSubmitting(true);
    // TODO: call backend API to add members / send invites
    setTimeout(() => {
      router.push(`/groups/${id}`);
    }, 500);
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
                {filteredUsers.length === 0 ? (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
