import { z } from "zod";
import { CATEGORY_COLOR_VALUES } from "@/lib/categories/palette";

export const MAX_CATEGORY_NAME_LENGTH = 30;

export const categoryInputSchema = z.object({
  name: z
    .string({ error: "יש להזין שם" })
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, { error: "יש להזין שם" })
        .max(MAX_CATEGORY_NAME_LENGTH, { error: `עד ${MAX_CATEGORY_NAME_LENGTH} תווים` }),
    ),
  color: z.enum(CATEGORY_COLOR_VALUES, { error: "יש לבחור צבע מהפלטה" }),
});

export const deleteCategorySchema = z.object({
  replacementId: z.uuid().nullish(),
});

export type CategoryInput = z.output<typeof categoryInputSchema>;
export type CategoryFormValues = z.input<typeof categoryInputSchema>;
