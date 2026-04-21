import { dbDeleteCache } from "@/lib/supabase";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ error: "Invalid id" }, { status: 400 });
  await dbDeleteCache(numId);
  return Response.json({ ok: true });
}
