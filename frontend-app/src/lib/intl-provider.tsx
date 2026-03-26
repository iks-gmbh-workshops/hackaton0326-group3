"use client";

import { NextIntlClientProvider } from "next-intl";
import { useLocale } from "@/lib/locale-context";
import { useEffect, useState, type ReactNode } from "react";

import enMessages from "../../messages/en.json";
import deMessages from "../../messages/de.json";

const messagesMap: Record<string, typeof enMessages> = {
  en: enMessages,
  de: deMessages,
};

export function IntlProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const messages = messagesMap[locale] ?? enMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
