import type { ReactNode } from "react";

export function NextIntlClientProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}) {
  const nav = messages.nav as { dashboard?: string } | undefined;

  return (
    <div
      data-dashboard={nav?.dashboard ?? ""}
      data-locale={locale}
      data-testid="next-intl-provider"
    >
      {children}
    </div>
  );
}

export function useTranslations(namespace?: string) {
  return (key: string) => (namespace ? `${namespace}.${key}` : key);
}
