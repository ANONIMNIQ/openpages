import { getSupabaseHeaders, getSupabaseKey, getSupabaseUrl, isSupabaseConfigured } from "./supabase-config";
import type { ContentType } from "./supabase-data";

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
  content_type?: ContentType;
  content_data?: Record<string, unknown> | null;
  sort_order?: number | null;
  published: boolean;
  is_featured: boolean;
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

export interface AdminMenuFilter {
  id: string;
  label: string;
  filter_type: "content_type" | "tag";
  filter_value: string;
  sort_order?: number | null;
  active: boolean;
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
  const headers = getSupabaseHeaders(accessToken);

  const topicsResponse = await fetch(
    `${supabaseUrl}/rest/v1/topics?select=id,title,description,custom_tag,content_type,content_data,sort_order,published,is_featured,created_at&order=sort_order.asc.nullslast,created_at.desc`,
    { headers }
  );
  
  if (!topicsResponse.ok) {
    const topicsError = await extractSupabaseError(topicsResponse);
    throw new Error(`Неуспешно зареждане на темите: ${topicsError}`);
  }

  const [argumentsResponse, commentsResponse, menuFiltersResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/arguments?select=id,topic_id,side,author,text,created_at&order=created_at.desc`, {
      headers,
    }),
    fetch(`${supabaseUrl}/rest/v1/argument_comments?select=id,argument_id,type,text,created_at&order=created_at.desc`, {
      headers,
    }),
    fetch(`${supabaseUrl}/rest/v1/menu_filters?select=id,label,filter_type,filter_value,sort_order,active,created_at&order=sort_order.asc.nullslast,created_at.asc`, {
      headers,
    }),
  ]);

  if (!argumentsResponse.ok) {
    const argumentsError = await extractSupabaseError(argumentsResponse);
    throw new Error(`Неуспешно зареждане на аргументите: ${argumentsError}`);
  }
  if (!commentsResponse.ok) {
    const commentsError = await extractSupabaseError(commentsResponse);
    throw new Error(`Неуспешно зареждане на коментарите: ${commentsError}`);
  }

  return {
    topics: (await topicsResponse.json()) as AdminTopic[],
    arguments: (await argumentsResponse.json()) as AdminArgument[],
    comments: (await commentsResponse.json()) as AdminComment[],
    menuFilters: menuFiltersResponse.ok ? ((await menuFiltersResponse.json()) as AdminMenuFilter[]) : ([] as AdminMenuFilter[]),
  };
}

export async function createTopicWithArguments(input: {
  accessToken: string;
  title: string;
  description: string;
  customTag?: string;
  contentType?: ContentType;
  contentData?: Record<string, unknown> | null;
  proArguments: string[];
  conArguments: string[];
  isFeatured?: boolean;
}) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const topicResponse = await fetch(`${supabaseUrl}/rest/v1/topics`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(input.accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      content_type: input.contentType ?? "debate",
      content_data: input.contentData ?? null,
      custom_tag: input.customTag?.trim() || null,
      published: true,
      is_featured: input.isFeatured ?? false,
    }),
  });

  if (!topicResponse.ok) {
    const error = await extractSupabaseError(topicResponse);
    throw new Error(`Неуспешно създаване на тема: ${error}`);
  }

  const createdTopics = (await topicResponse.json()) as AdminTopic[];
  const topic = createdTopics[0];
  if (!topic) throw new Error("Неуспешно създаване на тема: празен отговор.");

  const payload = [
    ...input.proArguments.map((text) => ({ topic_id: topic.id, side: "pro", text, author: "Анонимен" })),
    ...input.conArguments.map((text) => ({ topic_id: topic.id, side: "con", text, author: "Анонимен" })),
  ];

  if ((input.contentType ?? "debate") === "debate" && payload.length > 0) {
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

export async function updateTopic(
  accessToken: string,
  topicId: string,
  input: {
    title: string;
    description: string;
    customTag?: string;
    contentType?: ContentType;
    contentData?: Record<string, unknown> | null;
    sortOrder?: number | null;
    published: boolean;
    isFeatured: boolean;
  }
) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const payload = {
    title: input.title,
    description: input.description,
    custom_tag: input.customTag?.trim() || null,
    content_type: input.contentType ?? "debate",
    content_data: input.contentData ?? null,
    sort_order: input.sortOrder ?? null,
    published: input.published,
    is_featured: input.isFeatured,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/topics?id=eq.${topicId}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await extractSupabaseError(response);
    throw new Error(`Неуспешно редактиране на тема: ${error}`);
  }
}

// ... останалите методи остават непроменени
export async function createMenuFilter(input: {
  accessToken: string;
  label: string;
  filterType: "content_type" | "tag";
  filterValue: string;
  sortOrder?: number | null;
  active?: boolean;
}) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const response = await fetch(`${supabaseUrl}/rest/v1/menu_filters`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(input.accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      label: input.label,
      filter_type: input.filterType,
      filter_value: input.filterValue,
      sort_order: input.sortOrder ?? null,
      active: input.active ?? true,
    }),
  });
  if (!response.ok) {
    const error = await extractSupabaseError(response);
    throw new Error(`Неуспешно създаване на меню бутон: ${error}`);
  }
  const rows = (await response.json()) as AdminMenuFilter[];
  return rows[0] ?? null;
}

export async function updateMenuFilter(
  accessToken: string,
  filterId: string,
  input: {
    label: string;
    filterType: "content_type" | "tag";
    filterValue: string;
    sortOrder?: number | null;
    active: boolean;
  }
) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const response = await fetch(`${supabaseUrl}/rest/v1/menu_filters?id=eq.${filterId}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      label: input.label,
      filter_type: input.filterType,
      filter_value: input.filterValue,
      sort_order: input.sortOrder ?? null,
      active: input.active,
    }),
  });
  if (!response.ok) {
    const error = await extractSupabaseError(response);
    throw new Error(`Неуспешно обновяване на меню бутон: ${error}`);
  }
}

export async function deleteMenuFilter(accessToken: string, filterId: string) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const response = await fetch(`${supabaseUrl}/rest/v1/menu_filters?id=eq.${filterId}`, {
    method: "DELETE",
    headers: getSupabaseHeaders(accessToken),
  });
  if (!response.ok) {
    const error = await extractSupabaseError(response);
    throw new Error(`Неуспешно изтриване на меню бутон: ${error}`);
  }
}

export async function reorderMenuFilters(accessToken: string, orderedIds: string[]) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");
  for (const [index, filterId] of orderedIds.entries()) {
    const response = await fetch(`${supabaseUrl}/rest/v1/menu_filters?id=eq.${filterId}`, {
      method: "PATCH",
      headers: {
        ...getSupabaseHeaders(accessToken),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ sort_order: index + 1 }),
    });
    if (!response.ok) {
      const error = await extractSupabaseError(response);
      throw new Error(`Неуспешно подреждане на менюто: ${error}`);
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

export async function updateArgument(
  accessToken: string,
  argumentId: string,
  input: {
    text: string;
    side: "pro" | "con";
  }
) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");
  const response = await fetch(`${supabaseUrl}/rest/v1/arguments?id=eq.${argumentId}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      text: input.text,
      side: input.side,
    }),
  });
  if (!response.ok) {
    const error = await extractSupabaseError(response);
    throw new Error(`Неуспешно редактиране на аргумент: ${error}`);
  }
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

export async function updateComment(
  accessToken: string,
  commentId: string,
  input: {
    text: string;
    type: "pro" | "con";
  }
) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");
  const response = await fetch(`${supabaseUrl}/rest/v1/argument_comments?id=eq.${commentId}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseHeaders(accessToken),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      text: input.text,
      type: input.type,
    }),
  });
  if (!response.ok) {
    const error = await extractSupabaseError(response);
    throw new Error(`Неуспешно редактиране на коментар: ${error}`);
  }
}

export async function reorderTopics(accessToken: string, orderedTopicIds: string[]) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Supabase is not configured");

  const updates = orderedTopicIds.map((topicId, index) =>
    fetch(`${supabaseUrl}/rest/v1/topics?id=eq.${topicId}`, {
      method: "PATCH",
      headers: getSupabaseHeaders(accessToken),
      body: JSON.stringify({
        sort_order: index,
      }),
    })
  );

  const responses = await Promise.all(updates);
  const failed = responses.find((response) => !response.ok);
  if (failed) {
    const error = await extractSupabaseError(failed);
    throw new Error(`Неуспешно пренареждане: ${error}`);
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