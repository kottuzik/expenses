"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComingSoonBadge } from "@/components/ui/ComingSoon";
import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "./LogoutButton";
import { ACCESS_NAV, DATA_NAV, MAIN_NAV, isActive, type NavItem } from "./nav-items";
import styles from "./AppShell.module.css";

// Desktop navigation: fixed on the right (RTL), shows "More" destinations directly.
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.sideNav} aria-label="ניווט ראשי">
      <div className={styles.sideBrand}>
        <Logo size="small" />
        <span className="h4">ניהול הוצאות</span>
      </div>
      <ul className={styles.sideList}>
        {MAIN_NAV.map((item) => (
          <SideItem key={item.label} item={item} pathname={pathname} />
        ))}
      </ul>
      <ul className={styles.sideList} aria-label="ניהול נתונים">
        {DATA_NAV.map((item) => (
          <SideItem key={item.label} item={item} pathname={pathname} />
        ))}
      </ul>
      <ul className={styles.sideList} aria-label="גישה ואבטחה">
        {ACCESS_NAV.map((item) => (
          <SideItem key={item.label} item={item} pathname={pathname} />
        ))}
      </ul>
      <div className={styles.sideFooter}>
        <LogoutButton fullWidth />
      </div>
    </nav>
  );
}

function SideItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  if (!item.href) {
    return (
      <li>
        <span className={`${styles.sideLink} ${styles.disabled}`} aria-disabled="true">
          <Icon size={20} aria-hidden />
          <span className={styles.sideLabel}>{item.label}</span>
          <ComingSoonBadge />
        </span>
      </li>
    );
  }
  const active = isActive(item.href, pathname);
  return (
    <li>
      <Link
        href={item.href}
        className={`${styles.sideLink} ${active ? styles.active : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={20} aria-hidden />
        <span className={styles.sideLabel}>{item.label}</span>
      </Link>
    </li>
  );
}
