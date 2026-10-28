import styles from "./ComingSoon.module.css";

export function ComingSoonBadge() {
  return <span className={styles.badge}>בקרוב</span>;
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <section className={styles.page}>
      <h1 className="h2">{title}</h1>
      <div className={styles.card}>
        <p className="body-large">המסך הזה עדיין בבנייה ויהיה זמין בקרוב.</p>
      </div>
    </section>
  );
}
