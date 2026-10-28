// Expected business-rule failures, mapped to HTTP responses by the API layer.
export type DomainErrorCode =
  | "not_found"
  | "duplicate_name"
  | "last_category"
  | "replacement_required"
  | "replacement_invalid"
  | "category_missing";

const STATUS: Record<DomainErrorCode, number> = {
  not_found: 404,
  duplicate_name: 409,
  last_category: 409,
  replacement_required: 409,
  replacement_invalid: 400,
  category_missing: 409,
};

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode) {
    super(code);
  }

  get status(): number {
    return STATUS[this.code];
  }
}

// PostgreSQL error codes returned through PostgREST.
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
