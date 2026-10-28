import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/AppShell/LogoutButton";
import { ACCESS_NAV, DATA_NAV, type NavItem } from "@/components/AppShell/nav-items";
import { ComingSoonBadge } from "@/components/ui/ComingSoon";
import styles from "./more.module.css";

export default function MorePage() {
  return (
    <section className={styles.page}>
      <h1 className="h2">עוד</h1>
      <Group id="data" title="ניהול נתונים" items={DATA_NAV} />
      <Group id="access" title="גישה ואבטחה" items={ACCESS_NAV} />
      <LogoutButton fullWidth />
    </section>
  );
}

function Group({ id, title, items }: { id: string; title: string; items: NavItem[] }) {
  return (
    <section className={styles.group} aria-labelledby={`group-${id}`}>
      <h2 id={`group-${id}`} className={styles.groupTitle}>
        {title}
      </h2>
      <ul className={styles.list}>
        {items.map(({ label, icon: Icon, href }) =>
          href ? (
            <li key={label}>
              <Link href={href} className={`${styles.row} ${styles.link}`}>
                <Icon size={20} aria-hidden />
                <span className={styles.label}>{label}</span>
                <ChevronLeft size={20} aria-hidden />
              </Link>
            </li>
          ) : (
            <li key={label} className={styles.row}>
              <Icon size={20} aria-hidden />
              <span className={styles.label}>{label}</span>
              <ComingSoonBadge />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
