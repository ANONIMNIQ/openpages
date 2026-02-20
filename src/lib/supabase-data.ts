import { getSupabaseHeaders, getSupabaseUrl, isSupabaseConfigured } from "./supabase-config";

export type ContentType = "debate" | "poll" | "vs";

export interface DbTopic {
  id: string;
  title: string;
  description: string;
  custom_tag?: string | null;
  content_type?: ContentType;
  content_data?: Record<string, unknown> | null;
  sort_order?: number | null;
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

interface DbVoteRow {
  topic_id: string;
  option_id: string;
}

export interface TopicVoteOption {
  id: string;
  label: string;
  image?: string | null;
  color?: string | null;
  votes: number;
}

export interface PublishedTopic {
  id: string;
  title: string;
  description: string;
  tag?: string | null;
  tagIcon?: string | null;
  contentType: ContentType;
  contentData?: Record<string, unknown> | null;
  pollAllowMultiple?: boolean;
  argumentsCount: number;
  pro: DbArgument[];
  con: DbArgument[];
  voteOptions: TopicVoteOption[];
  totalVotes: number;
}

const parseStoredTag = (raw?: string | null): { label: string | null; icon: string | null } => {
  if (!raw) return { label: null, icon: null };
  const divider = "::";
  const dividerIndex = raw.indexOf(divider);
  if (dividerIndex <= 0) return { label: raw, icon: null };
  const icon = raw.slice(0, dividerIndex).trim();
  const label = raw.slice(dividerIndex + divider.length).trim();
  if (!label) return { label: raw, icon: null };
  return { label, icon: icon || null };
};

export interface PublicMenuFilter {
  id: string;
  label: string;
  filterType: "content_type" | "tag";
  filterValue: string;
  sortOrder: number | null;
  active: boolean;
}

const localVoterStorageKey = "open-pages-voter-key";

const createVoterKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `voter-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const getVoterKey = () => {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(localVoterStorageKey);
  if (existing) return existing;
  const created = createVoterKey();
  window.localStorage.setItem(localVoterStorageKey, created);
  return created;
};

const toVoteOptions = (topic: DbTopic, votesByOption: Record<string, number>) => {
  const topicType = topic.content_type ?? "debate";
  if (topicType === "poll") {
    const optionsRaw = Array.isArray((topic.content_data as { options?: unknown[] } | null)?.options)
      ? (((topic.content_data as { options?: unknown[] } | null)?.options ?? []) as Array<Record<string, unknown>>)
      : [];
    return optionsRaw.map((option, idx) => {
      const id = String(option.id ?? `poll-${idx + 1}`);
      const label = String(option.label ?? `Опция ${idx + 1}`);
      return {
        id,
        label,
        image: null,
        color: option.color ? String(option.color) : null,
        votes: votesByOption[id] ?? 0,
      } satisfies TopicVoteOption;
    });
  }

  if (topicType === "vs") {
    const left = ((topic.content_data as { left?: Record<string, unknown> } | null)?.left ?? {}) as Record<string, unknown>;
    const right = ((topic.content_data as { right?: Record<string, unknown> } | null)?.right ?? {}) as Record<string, unknown>;
    const leftId = String(left.id ?? "left");
    const rightId = String(right.id ?? "right");
    return [
      {
        id: leftId,
        label: String(left.name ?? "Ляв избор"),
        image: left.image ? String(left.image) : null,
        color: null,
        votes: votesByOption[leftId] ?? 0,
      },
      {
        id: rightId,
        label: String(right.name ?? "Десен избор"),
        image: right.image ? String(right.image) : null,
        color: null,
        votes: votesByOption[rightId] ?? 0,
      },
    ] satisfies TopicVoteOption[];
  }

  return [];
};

const extractSupabaseError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string; error?: string; hint?: string };
    return payload.message || payload.error || payload.hint || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

export async function fetchPublishedTopicsWithArguments() {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  let topicsResponse = await fetch(
    `${supabaseUrl}/rest/v1/topics?select=id,title,description,custom_tag,content_type,content_data,sort_order,published,created_at&published=eq.true&order=sort_order.asc.nullslast,created_at.desc`,
    { headers: getSupabaseHeaders(), cache: "no-store" }
  );
  if (!topicsResponse.ok) {
    const topicsError = await extractSupabaseError(topicsResponse);
    const missingExtendedColumns = ["content_type", "content_data", "sort_order", "custom_tag"].some((column) =>
      topicsError.toLowerCase().includes(column)
    );
    if (missingExtendedColumns) {
      topicsResponse = await fetch(
        `${supabaseUrl}/rest/v1/topics?select=id,title,description,published,created_at&published=eq.true&order=created_at.desc`,
        { headers: getSupabaseHeaders(), cache: "no-store" }
      );
    } else {
      throw new Error(`Failed to load topics (${topicsResponse.status})`);
    }
  }
  if (!topicsResponse.ok) throw new Error(`Failed to load topics (${topicsResponse.status})`);
  const topics = (await topicsResponse.json()) as DbTopic[];

  const argumentsResponse = await fetch(
    `${supabaseUrl}/rest/v1/arguments?select=id,topic_id,side,author,text,created_at&order=created_at.desc`,
    { headers: getSupabaseHeaders(), cache: "no-store" }
  );
  if (!argumentsResponse.ok) throw new Error(`Failed to load arguments (${argumentsResponse.status})`);
  const args = (await argumentsResponse.json()) as DbArgument[];

  const votesResponse = await fetch(`${supabaseUrl}/rest/v1/content_votes?select=topic_id,option_id`, {
    headers: getSupabaseHeaders(),
    cache: "no-store",
  });
  const votes = votesResponse.ok ? ((await votesResponse.json()) as DbVoteRow[]) : [];

  const byTopic = args.reduce<Record<string, DbArgument[]>>((acc, arg) => {
    if (!acc[arg.topic_id]) acc[arg.topic_id] = [];
    acc[arg.topic_id].push(arg);
    return acc;
  }, {});

  const votesByTopic = votes.reduce<Record<string, Record<string, number>>>((acc, vote) => {
    if (!acc[vote.topic_id]) acc[vote.topic_id] = {};
    acc[vote.topic_id][vote.option_id] = (acc[vote.topic_id][vote.option_id] ?? 0) + 1;
    return acc;
  }, {});

  return topics.map((topic) => {
    const topicArgs = byTopic[topic.id] ?? [];
    const pro = topicArgs.filter((arg) => arg.side === "pro");
    const con = topicArgs.filter((arg) => arg.side === "con");
    const contentType = topic.content_type ?? "debate";
    const voteOptions = toVoteOptions(topic, votesByTopic[topic.id] ?? {});
    const totalVotes = voteOptions.reduce((sum, option) => sum + option.votes, 0);
    const parsedTag = parseStoredTag(topic.custom_tag);
    const tag =
      contentType === "poll"
        ? "Анкета"
        : contentType === "vs"
          ? "VS"
          : parsedTag.label ?? null;
    const tagIcon =
      contentType === "debate"
        ? parsedTag.icon
        : null;

    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      tag,
      tagIcon,
      contentType,
      contentData: topic.content_data ?? null,
      pollAllowMultiple:
        contentType === "poll"
          ? Boolean((topic.content_data as { allowMultiple?: boolean } | null)?.allowMultiple)
          : false,
      argumentsCount: topicArgs.length,
      pro,
      con,
      voteOptions,
      totalVotes,
    } satisfies PublishedTopic;
  });
}

export async function fetchPublicMenuFilters() {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/menu_filters?select=id,label,filter_type,filter_value,sort_order,active&active=eq.true&order=sort_order.asc.nullslast,created_at.asc`,
    { headers: getSupabaseHeaders() }
  );

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as Array<{
    id: string;
    label: string;
    filter_type: "content_type" | "tag";
    filter_value: string;
    sort_order?: number | null;
    active?: boolean;
  }>;

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    filterType: row.filter_type,
    filterValue: row.filter_value,
    sortOrder: row.sort_order ?? null,
    active: row.active ?? true,
  })) satisfies PublicMenuFilter[];
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

export async function voteOnContent(input: { topicId: string; optionId: string; allowMultiple?: boolean }) {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  const baseVoterKey = getVoterKey();
  if (!supabaseUrl || !baseVoterKey) return null;
  const voterKey = input.allowMultiple ? `${baseVoterKey}:${input.optionId}` : `${baseVoterKey}:single`;

  const response = await fetch(`${supabaseUrl}/rest/v1/content_votes?on_conflict=topic_id,voter_key`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      topic_id: input.topicId,
      option_id: input.optionId,
      voter_key: voterKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to vote (${response.status})`);
  }

  return (await response.json()) as Array<{ topic_id: string; option_id: string; voter_key: string }>;
}

export async function unvoteOnContent(input: { topicId: string; optionId: string; allowMultiple?: boolean }) {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  const baseVoterKey = getVoterKey();
  if (!supabaseUrl || !baseVoterKey) return null;
  const candidateKeys = input.allowMultiple
    ? [`${baseVoterKey}:${input.optionId}`, `${baseVoterKey}:single`, baseVoterKey]
    : [`${baseVoterKey}:single`, baseVoterKey];

  const tryDelete = async (key: string) => {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/content_votes?topic_id=eq.${encodeURIComponent(input.topicId)}&option_id=eq.${encodeURIComponent(input.optionId)}&voter_key=eq.${encodeURIComponent(key)}`,
      {
        method: "DELETE",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=representation",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to remove vote (${response.status})`);
    }

    const deleted = (await response.json().catch(() => [])) as Array<{ topic_id: string }>;
    return deleted.length > 0;
  };

  for (const key of candidateKeys) {
    const deleted = await tryDelete(key);
    if (deleted) return true;
  }

  return false;
}
