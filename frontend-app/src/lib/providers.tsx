"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/locale-context";
import { IntlProvider } from "@/lib/intl-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <IntlProvider>
        <AuthProvider>{children}</AuthProvider>
      </IntlProvider>
    </LocaleProvider>
  );
}
