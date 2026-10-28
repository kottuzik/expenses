import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "התחברות | ניהול הוצאות" };

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <header className={styles.brand}>
          <Logo />
          <h1 className="h2">ניהול הוצאות</h1>
          <p className={styles.subtitle}>ניהול פיננסי פשוט וברור</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
