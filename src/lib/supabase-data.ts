import { getSupabaseHeaders, getSupabaseUrl, isSupabaseConfigured } from "./supabase-config";

export interface DbTopic {
  id: string;
  title: string;
  description: string;
  custom_tag?: string | null;
  published: boolean;
  created_at?: string;
}

export interface DbArgument {
  id: string;
  topic_id: string;
  side: "pro" | "con";
  author: string;
  text: string;
  created_at?: string;
}

export async function fetchPublishedTopicsWithArguments() {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  const topicsResponse = await fetch(
    `${supabaseUrl}/rest/v1/topics?select=id,title,description,custom_tag,published,created_at&published=eq.true&order=created_at.desc`,
    { headers: getSupabaseHeaders() }
  );
  if (!topicsResponse.ok) throw new Error(`Failed to load topics (${topicsResponse.status})`);
  const topics = (await topicsResponse.json()) as DbTopic[];

  const argumentsResponse = await fetch(
    `${supabaseUrl}/rest/v1/arguments?select=id,topic_id,side,author,text,created_at&order=created_at.asc`,
    { headers: getSupabaseHeaders() }
  );
  if (!argumentsResponse.ok) throw new Error(`Failed to load arguments (${argumentsResponse.status})`);
  const args = (await argumentsResponse.json()) as DbArgument[];

  const byTopic = args.reduce<Record<string, DbArgument[]>>((acc, arg) => {
    if (!acc[arg.topic_id]) acc[arg.topic_id] = [];
    acc[arg.topic_id].push(arg);
    return acc;
  }, {});

  return topics.map((topic) => {
    const topicArgs = byTopic[topic.id] ?? [];
    const pro = topicArgs.filter((arg) => arg.side === "pro");
    const con = topicArgs.filter((arg) => arg.side === "con");
    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      tag: topic.custom_tag ?? null,
      argumentsCount: topicArgs.length,
      pro,
      con,
    };
  });
}

export async function createPublicArgument(input: {
  topicId: string;
  side: "pro" | "con";
  text: string;
}) {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/arguments`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      topic_id: input.topicId,
      side: input.side,
      text: input.text,
      author: "Анонимен",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create argument (${response.status})`);
  }

  const rows = (await response.json()) as DbArgument[];
  return rows[0] ?? null;
}
