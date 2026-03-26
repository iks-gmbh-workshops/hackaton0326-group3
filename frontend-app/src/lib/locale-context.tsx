"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type AppLocale = "en" | "de";

const STORAGE_KEY = "drumdibum-locale";
const SUPPORTED_LOCALES: AppLocale[] = ["en", "de"];

function detectLocale(): AppLocale {
  if (typeof window === "undefined") return "en";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as AppLocale)) {
    return stored as AppLocale;
  }

  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LOCALES.includes(browserLang as AppLocale)) {
    return browserLang as AppLocale;
  }

  return "en";
}

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

function subscribeToHydration() {
  return () => {};
}

function useIsHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => detectLocale());
  const isHydrated = useIsHydrated();

  const setLocale = (newLocale: AppLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
