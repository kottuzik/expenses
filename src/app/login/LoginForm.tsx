"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ComingSoonBadge } from "@/components/ui/ComingSoon";
import { PasswordInput } from "@/components/ui/PasswordInput";
import styles from "./login.module.css";

const ERROR_MESSAGES: Record<string, string> = {
  empty: "יש להזין סיסמה",
  invalid_password: "הסיסמה שגויה",
  rate_limited: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות",
  offline: "אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב",
  server_error: "משהו השתבש. נסו שוב",
};

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError(ERROR_MESSAGES.empty);
      return;
    }
    if (!navigator.onLine) {
      setError(ERROR_MESSAGES.offline);
      return;
    }

    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(ERROR_MESSAGES[body.error ?? ""] ?? ERROR_MESSAGES.server_error);
    } catch {
      setError(ERROR_MESSAGES.offline);
    }
    setPending(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <PasswordInput
        label="סיסמה"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
        autoFocus
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "מתחבר…" : "התחברות"}
      </Button>
      <p className={styles.forgot} aria-disabled="true">
        <span>שכחתי סיסמה</span> <ComingSoonBadge />
      </p>
    </form>
  );
}
