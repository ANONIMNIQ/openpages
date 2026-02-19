type CommentType = "pro" | "con";
import { getSupabaseHeaders, getSupabaseUrl, isSupabaseConfigured } from "./supabase-config";

export interface ArgumentComment {
  id: string;
  argument_id: string;
  type: CommentType;
  text: string;
  created_at?: string;
}

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function fetchCommentsByArgumentIds(argumentIds: string[]) {
  if (!isSupabaseConfigured() || argumentIds.length === 0) return {} as Record<string, ArgumentComment[]>;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return {} as Record<string, ArgumentComment[]>;
  const validArgumentIds = argumentIds.filter((id) => uuidLike.test(id));
  if (validArgumentIds.length === 0) return {} as Record<string, ArgumentComment[]>;

  const params = new URLSearchParams({
    select: "id,argument_id,type,text,created_at",
    order: "created_at.desc",
  });
  params.set("argument_id", `in.(${validArgumentIds.join(",")})`);

  const response = await fetch(`${supabaseUrl}/rest/v1/argument_comments?${params.toString()}`, {
    headers: getSupabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load comments (${response.status})`);
  }

  const rows = (await response.json()) as ArgumentComment[];
  return rows.reduce<Record<string, ArgumentComment[]>>((acc, row) => {
    if (!acc[row.argument_id]) acc[row.argument_id] = [];
    acc[row.argument_id].push(row);
    return acc;
  }, {});
}

export async function createComment(input: {
  argumentId: string;
  type: CommentType;
  text: string;
}) {
  if (!isSupabaseConfigured()) return null;
  if (!uuidLike.test(input.argumentId)) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/argument_comments`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      argument_id: input.argumentId,
      type: input.type,
      text: input.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create comment (${response.status})`);
  }

  const rows = (await response.json()) as ArgumentComment[];
  return rows[0] ?? null;
}
