import styles from "./CategoryDot.module.css";

// The category name is always shown next to its color, never color alone.
export function CategoryDot({ color, name }: { color: string; name?: string }) {
  return (
    <span className={styles.wrap}>
      <span className={styles.dot} style={{ backgroundColor: color }} aria-hidden />
      {name !== undefined && <span>{name}</span>}
    </span>
  );
}
