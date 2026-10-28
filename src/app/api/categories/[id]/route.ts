import { apiRoute, parseBody, parseId } from "@/lib/api/route";
import { deleteCategory, updateCategory } from "@/lib/data/categories";
import { createAdminClient } from "@/lib/supabase/admin";
import { categoryInputSchema, deleteCategorySchema } from "@/lib/validation/category";

type Context = { params: Promise<{ id: string }> };

export const PATCH = apiRoute<Context>(
  async (request, { params }) => {
    const id = parseId((await params).id);
    const { data, response } = await parseBody(request, categoryInputSchema);
    if (response) return response;
    return Response.json(await updateCategory(createAdminClient(), id, data));
  },
  { mutation: true },
);

export const DELETE = apiRoute<Context>(
  async (request, { params }) => {
    const id = parseId((await params).id);
    const { data, response } = await parseBody(request, deleteCategorySchema);
    if (response) return response;
    await deleteCategory(createAdminClient(), id, data.replacementId ?? null);
    return Response.json({ ok: true });
  },
  { mutation: true },
);
