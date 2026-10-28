import { apiRoute, invalidRequest, parseBody } from "@/lib/api/route";
import { createExpense, listExpenses } from "@/lib/data/expenses";
import { createAdminClient } from "@/lib/supabase/admin";
import { expenseInputSchema } from "@/lib/validation/expense";
import { parseExpenseQuery } from "@/lib/validation/expense-query";

export const GET = apiRoute(async (request) => {
  const query = parseExpenseQuery(new URL(request.url).searchParams);
  if (!query.success) return invalidRequest(query.error);
  return Response.json(await listExpenses(createAdminClient(), query.data));
});

// Also used for duplicating: the form is prefilled from an existing expense and saved as new.
export const POST = apiRoute(
  async (request) => {
    const { data, response } = await parseBody(request, expenseInputSchema);
    if (response) return response;
    return Response.json(await createExpense(createAdminClient(), data), { status: 201 });
  },
  { mutation: true },
);
