"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./Pagination.module.css";

type Props = {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, total, pageSize, onPageChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1 && page <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="מעבר בין עמודים">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronRight size={20} aria-hidden />
        הקודם
      </Button>
      <span className={styles.status} aria-live="polite">
        עמוד {page} מתוך {pages}
      </span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        הבא
        <ChevronLeft size={20} aria-hidden />
      </Button>
    </nav>
  );
}
