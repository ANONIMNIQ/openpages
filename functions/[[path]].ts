interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

type TopicPreview = {
  id: string;
  title: string;
  description: string;
  custom_tag?: string | null;
  content_type?: "debate" | "poll" | "vs";
  published: boolean;
};

const htmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const clamp = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

const replaceMeta = (html: string, marker: string, value: string) => {
  const safe = htmlEscape(value);
  const re = new RegExp(`(<meta[^>]+${marker}[^>]+content=\")([^\"]*)(\"[^>]*>)`, "i");
  return html.replace(re, `$1${safe}$3`);
};

const isHtmlRoute = (pathname: string) => {
  if (pathname.startsWith("/api/")) return false;
  return !/\.[a-zA-Z0-9]+$/.test(pathname);
};

const parseTopicIdFromRef = (topicRef: string) => {
  const dividerIndex = topicRef.indexOf("--");
  if (dividerIndex === -1) return topicRef;
  return topicRef.slice(0, dividerIndex);
};

const extractTopicId = (url: URL) => {
  const pathMatch = url.pathname.match(/^\/t\/([^/]+)$/);
  if (pathMatch?.[1]) {
    return parseTopicIdFromRef(decodeURIComponent(pathMatch[1]));
  }
  return url.searchParams.get("topic");
};

const transliterateBgToLatin = (value: string) => {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sht",
    ъ: "a",
    ь: "y",
    ю: "yu",
    я: "ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
};

const slugify = (title: string) =>
  transliterateBgToLatin(title)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);

const getSupabaseConfig = (env: Env) => {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
};

const fetchTopic = async (env: Env, topicId: string): Promise<TopicPreview | null> => {
  const { url, key } = getSupabaseConfig(env);
  if (!url || !key) return null;

  const endpoint = `${url}/rest/v1/topics?select=id,title,description,custom_tag,content_type,published&id=eq.${encodeURIComponent(
    topicId
  )}&published=eq.true&limit=1`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as TopicPreview[];
  return rows[0] ?? null;
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!isHtmlRoute(url.pathname)) return context.next();

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let ogTitle = "Open pages";
  let ogDescription = "Отворена платформа за анонимни дискусии";
  let ogTag = "OPEN PAGES";
  let ogUrl = url.toString();

  const topicId = extractTopicId(url);
  if (topicId) {
    const topic = await fetchTopic(env, topicId);
    if (topic) {
      ogTitle = clamp(topic.title, 80);
      ogDescription = clamp(topic.description, 180);
      ogTag =
        topic.content_type === "poll"
          ? "АНКЕТА"
          : topic.content_type === "vs"
          ? "VS"
            : clamp(topic.custom_tag || "ТЕЗА", 28).toUpperCase();
      const slug = slugify(topic.title);
      ogUrl = slug ? `${url.origin}/t/${topic.id}--${slug}` : `${url.origin}/t/${topic.id}`;
    }
  }

  const ogImage = `${url.origin}/api/og-image?title=${encodeURIComponent(ogTitle)}&description=${encodeURIComponent(
    ogDescription
  )}&tag=${encodeURIComponent(ogTag)}`;

  let html = await response.text();
  html = replaceMeta(html, 'property="og:title"', ogTitle);
  html = replaceMeta(html, 'property="og:description"', ogDescription);
  html = replaceMeta(html, 'property="og:url"', ogUrl);
  html = replaceMeta(html, 'property="og:image"', ogImage);
  html = replaceMeta(html, 'name="twitter:title"', ogTitle);
  html = replaceMeta(html, 'name="twitter:description"', ogDescription);
  html = replaceMeta(html, 'name="twitter:image"', ogImage);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      "content-type": "text/html; charset=utf-8",
    },
  });
};
