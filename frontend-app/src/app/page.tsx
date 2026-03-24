"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Users, CalendarDays, Mail, ArrowRight } from "lucide-react";

export default function Home() {
  const { isLoggedIn, login } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-4 py-24 text-center md:py-32">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
          Organise group activities,{" "}
          <span className="text-primary/70">effortlessly</span>
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          Create groups, plan activities, invite friends — registered or not —
          and track who&apos;s in. All in one place.
        </p>
        <div className="flex gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              Go to Dashboard
              <ArrowRight className="ml-1 size-4" />
            </Link>
          ) : (
            <Button size="lg" onClick={login}>
              Get Started
              <ArrowRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-24 md:grid-cols-3">
        <FeatureCard
          icon={<Users className="size-6 text-primary" />}
          title="Group Management"
          description="Create groups and add members — search registered users or just enter an email to invite anyone."
        />
        <FeatureCard
          icon={<CalendarDays className="size-6 text-primary" />}
          title="Activity Planning"
          description="Schedule activities for your group with date, time, and location. Everyone gets notified."
        />
        <FeatureCard
          icon={<Mail className="size-6 text-primary" />}
          title="Easy RSVPs"
          description="Members accept or decline with one click. Admins see the full picture at a glance."
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
