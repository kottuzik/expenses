import type { ReactNode } from "react";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <SideNav />
      <main className={styles.content}>
        <div className={styles.inner}>
          <OfflineBanner />
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
