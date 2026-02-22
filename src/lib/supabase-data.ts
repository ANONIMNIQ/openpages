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
  is_featured?: boolean;
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

export interface PublicMenuFilter {
  id: string;
  label: string;
  filterType: "content_type" | "tag";
  filterValue: string;
  sortOrder: number | null;
  active: boolean;
}

export interface PublishedTopic {
  id: string;
  title: string;
  description: string;
  tag?: string | null;
  tagIcon?: string | null;
  customTagLabel?: string | null;
  contentType: ContentType;
  contentData?: Record<string, unknown> | null;
  pollAllowMultiple?: boolean;
  isClosed?: boolean;
  isFeatured: boolean;
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
  if (dividerIndex === -1) return { label: raw, icon: null };
  const icon = raw.slice(0, dividerIndex).trim();
  const label = raw.slice(dividerIndex + divider.length).trim();
  if (!label) return { label: icon || raw, icon: icon ? null : null };
  return { label, icon: icon || null };
};

const localVoterStorageKey = "open-pages-voter-key";

const getVoterKey = () => {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(localVoterStorageKey);
  if (existing) return existing;
  const created = crypto.randomUUID?.() || `voter-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(localVoterStorageKey, created);
  return created;
};

const toVoteOptions = (topic: DbTopic, votesByOption: Record<string, number>) => {
  const topicType = topic.content_type ?? "debate";
  if (topicType === "poll") {
    const optionsRaw = Array.isArray((topic.content_data as any)?.options)
      ? ((topic.content_data as any).options as Array<Record<string, unknown>>)
      : [];
    return optionsRaw.map((option, idx) => {
      const id = String(option.id ?? `poll-${idx + 1}`);
      return {
        id,
        label: String(option.label ?? `Опция ${idx + 1}`),
        image: null,
        color: option.color ? String(option.color) : null,
        votes: votesByOption[id] ?? 0,
      } satisfies TopicVoteOption;
    });
  }

  if (topicType === "vs") {
    const left = (topic.content_data as any)?.left ?? {};
    const right = (topic.content_data as any)?.right ?? {};
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

export async function fetchPublishedTopicsWithArguments() {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  let topics: DbTopic[] = [];
  
  const fullSelect = "id,title,description,custom_tag,content_type,content_data,sort_order,published,is_featured,created_at";
  const response = await fetch(
    `${supabaseUrl}/rest/v1/topics?select=${fullSelect}&published=eq.true&order=sort_order.asc.nullslast`,
    { headers: getSupabaseHeaders(), cache: "no-store" }
  );

  if (response.ok) {
    topics = await response.json();
  } else {
    const essentialSelect = "id,title,description,content_type,content_data,published,created_at";
    const fallback = await fetch(
      `${supabaseUrl}/rest/v1/topics?select=${essentialSelect}&published=eq.true&order=sort_order.asc.nullslast`,
      { headers: getSupabaseHeaders(), cache: "no-store" }
    );
    if (fallback.ok) {
      topics = await fallback.json();
    }
  }

  if (topics.length === 0) return [];

  const [argsRes, votesRes] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/arguments?select=id,topic_id,side,author,text,created_at&order=created_at.desc`, {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    }),
    fetch(`${supabaseUrl}/rest/v1/content_votes?select=topic_id,option_id`, {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    }),
  ]);

  const args = argsRes.ok ? ((await argsRes.json()) as DbArgument[]) : [];
  const votes = votesRes.ok ? ((await votesRes.json()) as DbVoteRow[]) : [];

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
    const contentType = topic.content_type ?? "debate";
    const voteOptions = toVoteOptions(topic, votesByTopic[topic.id] ?? {});
    const parsedTag = parseStoredTag(topic.custom_tag);
    
    // PRIORITY: Custom Tag > Content Type Label > Default
    let tag = parsedTag.label;
    if (!tag) {
      if (contentType === "poll") tag = "АНКЕТА";
      else if (contentType === "vs") tag = "VS";
      else tag = "ТЕЗА";
    }
    
    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      tag,
      tagIcon: parsedTag.icon,
      customTagLabel: parsedTag.label,
      contentType,
      contentData: topic.content_data ?? null,
      pollAllowMultiple: Boolean((topic.content_data as any)?.allowMultiple),
      isClosed: Boolean((topic.content_data as any)?.isClosed),
      isFeatured: Boolean(topic.is_featured),
      argumentsCount: topicArgs.length,
      pro: topicArgs.filter((arg) => arg.side === "pro"),
      con: topicArgs.filter((arg) => arg.side === "con"),
      voteOptions,
      totalVotes: voteOptions.reduce((sum, option) => sum + option.votes, 0),
    } satisfies PublishedTopic;
  });
}

export async function fetchPublicMenuFilters() {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/menu_filters?select=id,label,filter_type,filter_value,sort_order,active&active=eq.true&order=sort_order.asc.nullslast,created_at.asc`,
      { headers: getSupabaseHeaders() }
    );
    if (!response.ok) return [];
    const rows = await response.json();
    return rows.map((row: any) => ({
      id: row.id,
      label: row.label,
      filterType: row.filter_type,
      filterValue: row.filter_value,
      sortOrder: row.sort_order ?? null,
      active: row.active ?? true,
    })) satisfies PublicMenuFilter[];
  } catch {
    return [];
  }
}

export async function createPublicArgument(input: { topicId: string; side: "pro" | "con"; text: string }) {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/arguments`, {
    method: "POST",
    headers: { ...getSupabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({ topic_id: input.topicId, side: input.side, text: input.text, author: "Анонимен" }),
  });

  if (!response.ok) throw new Error(`Failed to create argument`);
  const rows = await response.json();
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
    headers: { ...getSupabaseHeaders(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ topic_id: input.topicId, option_id: input.optionId, voter_key: voterKey }),
  });

  if (!response.ok) throw new Error(`Failed to vote`);
  return response.json();
}

export async function unvoteOnContent(input: { topicId: string; optionId: string; allowMultiple?: boolean }) {
  if (!isSupabaseConfigured()) return null;
  const supabaseUrl = getSupabaseUrl();
  const baseVoterKey = getVoterKey();
  if (!supabaseUrl || !baseVoterKey) return null;
  const key = input.allowMultiple ? `${baseVoterKey}:${input.optionId}` : `${baseVoterKey}:single`;

  const del = await fetch(
    `${supabaseUrl}/rest/v1/content_votes?topic_id=eq.${encodeURIComponent(input.topicId)}&option_id=eq.${encodeURIComponent(input.optionId)}&voter_key=eq.${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: { ...getSupabaseHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({ option_id: `__unvoted__${Date.now()}` }),
    }
  );
  return del.ok;
}