"use client";

import React, { createContext, useContext, ReactNode } from "react";

export interface PlatformSettingsContextType {
  siteName?: string;
  supportEmail?: string;
  primaryPhone?: string;
  headerLogo?: string;
  footerLogo?: string;
  favicon?: string;
  [key: string]: any;
}

const PlatformContext = createContext<PlatformSettingsContextType>({});

export function PlatformProvider({
  children,
  settings,
}: {
  children: ReactNode;
  settings: PlatformSettingsContextType;
}) {
  return (
    <PlatformContext.Provider value={settings}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatformSettings() {
  return useContext(PlatformContext);
}
