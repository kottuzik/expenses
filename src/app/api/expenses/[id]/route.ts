import { apiRoute, parseBody, parseId } from "@/lib/api/route";
import { getExpense, updateExpense } from "@/lib/data/expenses";
import { createAdminClient } from "@/lib/supabase/admin";
import { expenseInputSchema } from "@/lib/validation/expense";

type Context = { params: Promise<{ id: string }> };

export const GET = apiRoute<Context>(async (_request, { params }) => {
  const id = parseId((await params).id);
  return Response.json(await getExpense(createAdminClient(), id));
});

export const PATCH = apiRoute<Context>(
  async (request, { params }) => {
    const id = parseId((await params).id);
    const { data, response } = await parseBody(request, expenseInputSchema);
    if (response) return response;
    return Response.json(await updateExpense(createAdminClient(), id, data));
  },
  { mutation: true },
);
