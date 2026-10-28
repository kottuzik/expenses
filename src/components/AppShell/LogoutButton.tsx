"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LogoutButton({ fullWidth }: { fullWidth?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleLogout() {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="danger" fullWidth={fullWidth} onClick={handleLogout} disabled={pending}>
        <LogOut size={20} aria-hidden />
        התנתקות
      </Button>
      {failed && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          ההתנתקות נכשלה. בדקו את החיבור ונסו שוב
        </p>
      )}
    </>
  );
}
