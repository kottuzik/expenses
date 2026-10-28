import { Suspense } from "react";
import { ExpensesScreen } from "./ExpensesScreen";

export default function ExpensesPage() {
  return (
    <Suspense>
      <ExpensesScreen />
    </Suspense>
  );
}
