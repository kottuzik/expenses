"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";
import styles from "./OfflineBanner.module.css";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p className={styles.banner} role="alert">
      <WifiOff size={20} aria-hidden />
      אין חיבור לאינטרנט – לא ניתן לשמור שינויים.
    </p>
  );
}
