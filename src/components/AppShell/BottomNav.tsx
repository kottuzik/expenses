"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV, isMainActive } from "./nav-items";
import styles from "./AppShell.module.css";

// Mobile/tablet navigation: fixed bar with the four main destinations.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav} aria-label="ניווט ראשי">
      <ul className={styles.bottomList}>
        {MAIN_NAV.map(({ label, icon: Icon, href }) => {
          const active = href ? isMainActive(href, pathname) : false;
          return (
            <li key={label}>
              <Link
                href={href ?? "/"}
                className={`${styles.bottomLink} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={24} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
