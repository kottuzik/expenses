import { ChartNoAxesColumn } from "lucide-react";
import styles from "./Logo.module.css";

export function Logo({ size = "large" }: { size?: "large" | "small" }) {
  return (
    <span className={`${styles.badge} ${styles[size]}`} aria-hidden>
      <ChartNoAxesColumn strokeWidth={3} />
    </span>
  );
}
