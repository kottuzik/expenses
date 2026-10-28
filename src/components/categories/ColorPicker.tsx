"use client";

import { Check } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { CATEGORY_COLORS } from "@/lib/categories/palette";
import styles from "./ColorPicker.module.css";

// A radio group of the 12 palette colors; each color has a readable name for screen readers.
export function ColorPicker({
  registration,
  selected,
  error,
}: {
  registration: UseFormRegisterReturn;
  selected: string;
  error?: string;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>צבע</legend>
      <div className={styles.grid}>
        {CATEGORY_COLORS.map((color) => (
          <label key={color.hex} className={styles.option} title={color.name}>
            <input type="radio" value={color.hex} className={styles.input} aria-label={color.name} {...registration} />
            <span className={styles.swatch} style={{ backgroundColor: color.hex }} aria-hidden>
              {selected === color.hex && <Check size={18} strokeWidth={3} />}
            </span>
          </label>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </fieldset>
  );
}
