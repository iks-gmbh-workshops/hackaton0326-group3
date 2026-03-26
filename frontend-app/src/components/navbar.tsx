"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, Menu, X } from "lucide-react";
import { useState } from "react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Navbar() {
  const { user, notifications, isLoggedIn, isLoading, consumeNotification, login, logout } =
    useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="text-lg font-bold tracking-tight">
          drumdibum
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Dashboard
              </Link>
              <Link href="/activities" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Activities
              </Link>
              <Link href="/groups/new" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                New Group
              </Link>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-3 py-2 text-sm font-semibold">
                    Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
                  </div>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <DropdownMenuItem key={n.id} onSelect={() => consumeNotification(n.id)}>
                        <Link
                          href={n.link ?? "#"}
                          className="flex w-full flex-col items-start gap-0.5"
                          onClick={() => consumeNotification(n.id)}
                        >
                          <span className={n.read ? "text-muted-foreground" : "font-medium"}>
                            {n.title}
                          </span>
                          <span className="text-xs text-muted-foreground">{n.message}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {user ? getInitials(user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/profile" className="flex w-full items-center">
                      <User className="mr-2 size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      void logout();
                    }}
                  >
                    <LogOut className="mr-2 size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              disabled={isLoading}
              onClick={() => {
                void login();
              }}
            >
              {isLoading ? "Loading..." : "Login"}
            </Button>
          )}
        </nav>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/activities"
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Activities
              </Link>
              <Link
                href="/groups/new"
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                New Group
              </Link>
              <Link
                href="/profile"
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Profile
              </Link>
              <button
                className="rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                onClick={() => {
                  void logout();
                  setMobileOpen(false);
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={isLoading}
              onClick={() => {
                void login();
              }}
            >
              {isLoading ? "Loading..." : "Login"}
            </Button>
          )}
        </nav>
      )}
    </header>
  );
}
