"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "accepting" | "declining" | "done">("pending");
  const t = useTranslations("invite");

  // TODO: validate token against backend and fetch group info
  const groupName = "Weekend Hikers";

  const handleAccept = () => {
    setStatus("accepting");
    // TODO: call backend API to accept invite and register/join
    setTimeout(() => {
      setStatus("done");
      router.push("/dashboard");
    }, 1000);
  };

  const handleDecline = () => {
    setStatus("declining");
    // TODO: call backend API to decline invite
    setTimeout(() => {
      setStatus("done");
    }, 500);
  };

  if (status === "done") {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="py-12">
            <p className="text-lg font-medium">{t("handled")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("canClose")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-primary" />
          </div>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            {t.rich("invitedTo", {
              name: groupName,
              group: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("instructions")}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={handleAccept}
              disabled={status !== "pending"}
            >
              <Check className="mr-1 size-4" />
              {status === "accepting" ? t("joining") : t("acceptAndJoin")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={status !== "pending"}
            >
              <X className="mr-1 size-4" />
              {status === "declining" ? t("declining") : t("decline")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
