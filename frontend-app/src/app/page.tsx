"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Users, CalendarDays, Mail, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Home() {
  const { isLoggedIn, isLoading, login } = useAuth();
  const t = useTranslations("landing");

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-4 py-24 text-center md:py-32">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
          {t.rich("headline", {
            accent: (chunks) => <span className="text-primary/70">{chunks}</span>,
          })}
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
        <div className="flex gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              {t("goToDashboard")}
              <ArrowRight className="ml-1 size-4" />
            </Link>
          ) : (
            <Button
              size="lg"
              disabled={isLoading}
              onClick={() => {
                void login();
              }}
            >
              {t("getStarted")}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-24 md:grid-cols-3">
        <FeatureCard
          icon={<Users className="size-6 text-primary" />}
          title={t("featureGroupsTitle")}
          description={t("featureGroupsDesc")}
        />
        <FeatureCard
          icon={<CalendarDays className="size-6 text-primary" />}
          title={t("featureActivitiesTitle")}
          description={t("featureActivitiesDesc")}
        />
        <FeatureCard
          icon={<Mail className="size-6 text-primary" />}
          title={t("featureRsvpTitle")}
          description={t("featureRsvpDesc")}
        />
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
