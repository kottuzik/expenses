import { now } from "@/lib/clock";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const month = new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  }).format(now());

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className="h2">לוח בקרה</h1>
        <p className={styles.month}>{month}</p>
      </header>
      <div className={styles.card}>
        <p className="body-large">כאן יוצג סיכום הוצאות החודש – בקרוב.</p>
      </div>
    </section>
  );
}
