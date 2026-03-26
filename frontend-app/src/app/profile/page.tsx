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
import { useTranslations } from "next-intl";
import { useConfirmDialog } from "@/components/confirmation-dialog";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { user, accessToken, logout, refreshUser, isLoading, isLoggedIn } = useAuth();
  const tc = useTranslations("common");
  const t = useTranslations("profile");

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{tc("checkingAuth")}</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t("loginToView")}</p>
      </div>
    );
  }

  return (
    <ProfileContent
      key={user.id}
      user={user}
      accessToken={accessToken}
      logout={logout}
      refreshUser={refreshUser}
    />
  );
}

function ProfileContent({
  user,
  accessToken,
  logout,
  refreshUser,
}: {
  user: User;
  accessToken: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const { confirm, dialog } = useConfirmDialog();
  const nameParts = user.name.split(" ");
  const initialFirstName = nameParts[0] || "";
  const initialLastName = nameParts.slice(1).join(" ") || "";
  
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const email = user.email;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    void (async () => {
      if (!accessToken) {
        setSaveError(tc("missingToken"));
        return;
      }

      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        await updateOwnProfile(accessToken, firstName.trim(), lastName.trim(), email.trim());
        await refreshUser();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
        setSaveError(
          isUserApiError(error) ? error.message : t("failedToUpdate")
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDeleteAccount = () => {
    void (async () => {
      if (!accessToken) {
        setDeleteError(tc("missingToken"));
        return;
      }

      const confirmed = await confirm({
        title: t("deleteAccount"),
        description: t("confirmDelete"),
        variant: "destructive",
      });

      if (!confirmed) {
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
          isUserApiError(error) ? error.message : t("failedToDelete")
        );
        setDeleting(false);
      }
    })();
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

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
              <Label htmlFor="firstName">{t("firstName")}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("lastName")}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
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
                {saving ? tc("saving") : t("saveChanges")}
              </Button>
              {saveSuccess && (
                <p className="text-sm text-green-600">{t("profileUpdated")}</p>
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
          <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("deleteAccountWarning")}
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            <Trash2 className="mr-1 size-4" />
            {deleting ? t("deletingAccount") : t("deleteAccount")}
          </Button>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}
