import { getSupabaseHeaders, getSupabaseKey, getSupabaseUrl, isSupabaseConfigured } from "./supabase-config";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email?: string;
  };
}

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email?: string;
}

export interface AdminTopic {
  id: string;
  title: string;
  description: string;
  custom_tag?: string | null;
  published: boolean;
  created_at?: string;
}

export interface AdminArgument {
  id: string;
  topic_id: string;
  side: "pro" | "con";
  author: string;
  text: string;
  created_at?: string;
}

export interface AdminComment {
  id: string;
  argument_id: string;
  type: "pro" | "con";
  text: string;
  created_at?: string;
}

export const adminSessionStorageKey = "open-pages-admin-session";

async function extractSupabaseError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string; error?: string; hint?: string };
    return payload.message || payload.error || payload.hint || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function loginAdminWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured");

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!authResponse.ok) {
    throw new Error("Невалиден имейл или парола.");
  }

  const data = (await authResponse.json()) as AuthResponse;
  const isAdmin = await checkIsAdminUser(data.user.id, data.access_token);
  if (!isAdmin) {
    throw new Error("Този профил няма админ права.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user.id,
    email: data.user.email,
  } satisfies AdminSession;
}

export async function checkIsAdminUser(userId: string, accessToken: string) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return false;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/admin_users?select=user_id&user_id=eq.${userId}&limit=1`,
    { headers: getSupabaseHeaders(accessToken) }
  );
  if (!response.ok) return false;
  const rows = (await response.json()) as Array<{ user_id: string }>;
  return rows.length > 0;
}

export async function fetchAdminData(accessToken: string) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const [topicsResponse, argumentsResponse, commentsResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/topics?select=id,title,description,custom_tag,published,created_at&order=created_at.desc`, {
      headers: getSupabaseHeaders(accessToken),
    }),
    fetch(`${supabaseUrl}/rest/v1/arguments?select=id,topic_id,side,author,text,created_at&order=created_at.desc`, {
      headers: getSupabaseHeaders(accessToken),
    }),
    fetch(
      `${supabaseUrl}/rest/v1/argument_comments?select=id,argument_id,type,text,created_at&order=created_at.desc`,
      {
        headers: getSupabaseHeaders(accessToken),
      }
    ),
  ]);

  if (!topicsResponse.ok || !argumentsResponse.ok || !commentsResponse.ok) {
    throw new Error("Неуспешно зареждане на админ данните.");
  }

  return {
    topics: (await topicsResponse.json()) as AdminTopic[],
    arguments: (await argumentsResponse.json()) as AdminArgument[],
    comments: (await commentsResponse.json()) as AdminComment[],
  };
}

export async function createTopicWithArguments(input: {
  accessToken: string;
  title: string;
  description: string;
  customTag?: string;
  proArguments: string[];
  conArguments: string[];
}) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const baseTopicPayload = {
    title: input.title,
    description: input.description,
    published: true,
  };
  const customTagValue = input.customTag?.trim() ? input.customTag.trim() : null;

  let topicResponse = await fetch(`${supabaseUrl}/rest/v1/topics`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(input.accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      ...baseTopicPayload,
      custom_tag: customTagValue,
    }),
  });

  // Backward compatibility if production DB still misses custom_tag column.
  if (!topicResponse.ok) {
    const insertError = await extractSupabaseError(topicResponse);
    const missingCustomTagColumn = insertError.toLowerCase().includes("custom_tag");

    if (missingCustomTagColumn) {
      topicResponse = await fetch(`${supabaseUrl}/rest/v1/topics`, {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(input.accessToken),
          Prefer: "return=representation",
        },
        body: JSON.stringify(baseTopicPayload),
      });
    } else {
      throw new Error(`Неуспешно създаване на тема: ${insertError}`);
    }
  }

  if (!topicResponse.ok) {
    const retryError = await extractSupabaseError(topicResponse);
    throw new Error(`Неуспешно създаване на тема: ${retryError}`);
  }
  const createdTopics = (await topicResponse.json()) as AdminTopic[];
  const topic = createdTopics[0];
  if (!topic) throw new Error("Неуспешно създаване на тема: празен отговор.");

  const payload = [
    ...input.proArguments.map((text) => ({ topic_id: topic.id, side: "pro", text, author: "Анонимен" })),
    ...input.conArguments.map((text) => ({ topic_id: topic.id, side: "con", text, author: "Анонимен" })),
  ];

  if (payload.length > 0) {
    const argsResponse = await fetch(`${supabaseUrl}/rest/v1/arguments`, {
      method: "POST",
      headers: getSupabaseHeaders(input.accessToken),
      body: JSON.stringify(payload),
    });
    if (!argsResponse.ok) {
      const argsError = await extractSupabaseError(argsResponse);
      throw new Error(`Темата е създадена, но аргументите не бяха записани: ${argsError}`);
    }
  }
}

export async function deleteArgument(accessToken: string, argumentId: string) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");
  const response = await fetch(`${supabaseUrl}/rest/v1/arguments?id=eq.${argumentId}`, {
    method: "DELETE",
    headers: getSupabaseHeaders(accessToken),
  });
  if (!response.ok) throw new Error("Неуспешно изтриване на аргумент.");
}

export async function deleteComment(accessToken: string, commentId: string) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");
  const response = await fetch(`${supabaseUrl}/rest/v1/argument_comments?id=eq.${commentId}`, {
    method: "DELETE",
    headers: getSupabaseHeaders(accessToken),
  });
  if (!response.ok) throw new Error("Неуспешно изтриване на коментар.");
}

export async function updateTopic(
  accessToken: string,
  topicId: string,
  input: { title: string; description: string; customTag?: string; published: boolean }
) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");
  let response = await fetch(`${supabaseUrl}/rest/v1/topics?id=eq.${topicId}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      custom_tag: input.customTag?.trim() ? input.customTag.trim() : null,
      published: input.published,
    }),
  });
  if (!response.ok) {
    const updateError = await extractSupabaseError(response);
    const missingCustomTagColumn = updateError.toLowerCase().includes("custom_tag");
    if (missingCustomTagColumn) {
      response = await fetch(`${supabaseUrl}/rest/v1/topics?id=eq.${topicId}`, {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(accessToken),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          title: input.title,
          description: input.description,
          published: input.published,
        }),
      });
    } else {
      throw new Error(`Неуспешно редактиране на тема: ${updateError}`);
    }
  }
  if (!response.ok) {
    const retryError = await extractSupabaseError(response);
    throw new Error(`Неуспешно редактиране на тема: ${retryError}`);
  }
}

export async function deleteTopic(accessToken: string, topicId: string) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");
  const response = await fetch(`${supabaseUrl}/rest/v1/topics?id=eq.${topicId}`, {
    method: "DELETE",
    headers: getSupabaseHeaders(accessToken),
  });
  if (!response.ok) throw new Error("Неуспешно изтриване на тема.");
}
