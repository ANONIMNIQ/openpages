interface Env {}

const esc = (value: string) =>
  value
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const clampText = (value: string, max = 120) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const title = clampText(url.searchParams.get("title") || "Open pages", 80);
  const description = clampText(
    url.searchParams.get("description") || "ТВОЕТО АНОНИМНО МНЕНИЕ ЗА АКТУАЛНИТЕ ТЕМИ НА ДЕНЯ",
    180
  );
  const tag = clampText(url.searchParams.get("tag") || "OPEN PAGES", 28);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f2f2f2"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="56" y="56" width="1088" height="518" rx="26" fill="#ffffff" stroke="#ececec" stroke-width="2"/>
  <circle cx="180" cy="170" r="56" fill="#000000"/>
  <g transform="rotate(-38 180 170)">
    <rect x="154" y="165" width="52" height="12" rx="4" fill="#ffffff"/>
    <polygon points="206,165 220,171 206,177" fill="#ffffff"/>
    <rect x="146" y="165" width="8" height="12" rx="2" fill="#000000"/>
  </g>
  <text x="255" y="184" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900" fill="#111111">open pages</text>
  <text x="80" y="292" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="#6b7280">${esc(
    tag
  )}</text>
  <text x="80" y="370" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="900" fill="#111111">${esc(
    title
  )}</text>
  <foreignObject x="80" y="400" width="1020" height="150">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, Helvetica, sans-serif; color:#4b5563; font-size:33px; line-height:1.28;">
      ${esc(description)}
    </div>
  </foreignObject>
</svg>
`.trim();

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};