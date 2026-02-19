export const transliterateBgToLatin = (value: string) => {
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

export const slugifyTopicTitle = (title: string) => {
  return transliterateBgToLatin(title)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
};

export const parseTopicIdFromRef = (topicRef?: string | null) => {
  if (!topicRef) return null;
  const dividerIndex = topicRef.indexOf("--");
  if (dividerIndex === -1) return topicRef;
  return topicRef.slice(0, dividerIndex) || null;
};

export const buildTopicPath = (topicId: string, title: string) => {
  const slug = slugifyTopicTitle(title);
  return slug ? `/t/${topicId}--${slug}` : `/t/${topicId}`;
};
