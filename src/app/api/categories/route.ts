import { apiRoute, parseBody } from "@/lib/api/route";
import { createCategory, listCategories } from "@/lib/data/categories";
import { createAdminClient } from "@/lib/supabase/admin";
import { categoryInputSchema } from "@/lib/validation/category";

export const GET = apiRoute(async () => {
  return Response.json({ items: await listCategories(createAdminClient()) });
});

export const POST = apiRoute(
  async (request) => {
    const { data, response } = await parseBody(request, categoryInputSchema);
    if (response) return response;
    return Response.json(await createCategory(createAdminClient(), data), { status: 201 });
  },
  { mutation: true },
);
