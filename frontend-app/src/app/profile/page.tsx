"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { updateOwnProfile, deleteOwnAccount, isUserApiError } from "@/lib/user-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import type { User } from "@/lib/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { user, isLoggedIn, isLoading, accessToken, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <ProfileContent
      key={user.id}
      user={user}
      accessToken={accessToken}
      logout={logout}
    />
  );
}

function ProfileContent({
  user,
  accessToken,
  logout,
}: {
  user: User;
  accessToken: string | null;
  logout: () => Promise<void>;
}) {
  const nameParts = user.name.split(" ");
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";
  
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    void (async () => {
      if (!accessToken) {
        setSaveError("Missing access token. Please log in again.");
        return;
      }

      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        await updateOwnProfile(accessToken, firstName.trim(), lastName.trim(), email.trim());
        setSaveSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        setSaveError(
          isUserApiError(error) ? error.message : "Failed to update profile. Please try again."
        );
        setSaving(false);
      }
    })();
  };

  const handleDeleteAccount = () => {
    void (async () => {
      if (!accessToken) {
        setDeleteError("Missing access token. Please log in again.");
        return;
      }

      if (!window.confirm("Delete your account permanently? This cannot be undone.")) {
        return;
      }

      setDeleting(true);
      setDeleteError(null);

      try {
        await deleteOwnAccount(accessToken);
        try {
          await logout();
        } catch {
          window.location.href = "/";
        }
      } catch (error) {
        setDeleteError(
          isUserApiError(error) ? error.message : "Failed to delete account. Please try again."
        );
        setDeleting(false);
      }
    })();
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm font-normal text-muted-foreground">{user.email}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              {saveSuccess && (
                <p className="text-sm text-green-600">Profile updated successfully!</p>
              )}
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator className="mb-6" />

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting your account will permanently remove all your data, including
            group memberships and activity history. This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            <Trash2 className="mr-1 size-4" />
            {deleting ? "Deleting…" : "Delete Account"}
          </Button>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
