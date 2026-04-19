const AKGUNLER_SCHEDULE_URL = "https://www.akgunlerbilet.com/sefer-takvimi.php";
const SCHEDULE_PROXY_URL = process.env.AKGUNLER_SCHEDULE_PROXY_URL ?? "";
const SCHEDULE_PROXY_SECRET = process.env.AKGUNLER_PROXY_SECRET ?? "";

export interface ScheduleRouteLink {
  title: string;
  href: string;
  mod: string;
  slug: string;
}

export interface ScheduleTrip {
  direction: string;
  time: string;
  vessel: string;
}

export interface ScheduleDay {
  date: string;
  weekday: string;
  trips: ScheduleTrip[];
}

export interface SchedulePayload {
  sourceUrl: string;
  selectedRoute: ScheduleRouteLink | null;
  routes: ScheduleRouteLink[];
  directions: string[];
  days: ScheduleDay[];
}

function stripTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|tr|table|h1|h2|h3|h4|h5|h6|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ");
}

function toLines(value: string) {
  return stripTags(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseRoutes(html: string): ScheduleRouteLink[] {
  const matches = Array.from(
    html.matchAll(
      /href="([^"]*sefer-takvimi\.php\?mod=(\d+)[^"]*)"[^>]*>[\s\S]*?<b>\s*([^<]+?)\s*<\/b>/gi
    )
  );

  const routes = matches
    .map((match) => ({
      href: match[1].startsWith("http")
        ? match[1]
        : new URL(match[1], AKGUNLER_SCHEDULE_URL).toString(),
      mod: match[2],
      title: match[3].replace(/\s+/g, " ").trim(),
      slug: slugify(match[3]),
    }))
    .filter((item) => item.title.length > 0);

  const unique = new Map<string, ScheduleRouteLink>();
  for (const route of routes) {
    if (!unique.has(route.mod)) {
      unique.set(route.mod, route);
    }
  }

  return Array.from(unique.values());
}

function parseDirectionsFromTitle(title: string) {
  const match = title.match(/\(([^)]+)\)/);
  const routeText = match ? match[1] : title;
  const parts = routeText
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return [`${parts[0]} → ${parts[1]}`, `${parts[1]} → ${parts[2]}`];
  }

  if (parts.length === 2) {
    return [`${parts[0]} → ${parts[1]}`, `${parts[1]} → ${parts[0]}`];
  }

  return [routeText];
}

function extractScheduleTable(html: string): string | null {
  const match = html.match(
    /<table[^>]*id=["']table_sefer_takvimi["'][^>]*>[\s\S]*?<\/table>/i
  );
  return match ? match[0] : null;
}

function parseTableHeaders(tableHtml: string): string[] {
  const headMatch = tableHtml.match(/<thead[\s\S]*?<\/thead>/i);
  if (!headMatch) return [];
  const thMatches = Array.from(headMatch[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi));
  return thMatches
    .map((m) => stripTags(m[1]).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((label) => label.replace(/\s*-\s*/g, " → "));
}

function parseCell(cellHtml: string): { time: string; vessel: string } | null {
  const text = stripTags(cellHtml)
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text === "-") return null;

  const timeMatch = text.match(/(\d{1,2}:\d{2})/);
  if (!timeMatch) return null;

  const vessel = text.replace(timeMatch[0], "").trim();
  return { time: timeMatch[1], vessel };
}

function parseScheduleDays(html: string, fallbackDirections: string[]): ScheduleDay[] {
  const table = extractScheduleTable(html);
  if (!table) return [];

  const headers = parseTableHeaders(table);
  // headers: ["", "Anamur → Girne", "Girne → Anamur"] — skip the empty first column
  const directions = headers.slice(1).filter(Boolean);
  const effectiveDirections = directions.length > 0 ? directions : fallbackDirections;

  const rowMatches = Array.from(table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));

  const days: ScheduleDay[] = [];
  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[1];
    if (/<th[\s>]/i.test(rowHtml)) continue;

    const tdMatches = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    if (tdMatches.length === 0) continue;

    const dateCellText = stripTags(tdMatches[0][1])
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const dateMatch = dateCellText.match(/(\d{2}\/\d{2}\/\d{4})\s*(.*)/);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const weekday = dateMatch[2].trim();

    const trips: ScheduleTrip[] = [];
    for (let i = 1; i < tdMatches.length; i++) {
      const cell = parseCell(tdMatches[i][1]);
      if (!cell) continue;
      trips.push({
        direction: effectiveDirections[i - 1] ?? effectiveDirections[0] ?? "Sefer",
        time: cell.time,
        vessel: cell.vessel,
      });
    }

    if (trips.length > 0) {
      days.push({ date, weekday, trips });
    }
  }

  return days;
}

async function fetchHtml(url: string) {
  // Cloudflare bloğunu aşmak için Turhost proxy üzerinden çek
  const useProxy = SCHEDULE_PROXY_URL && SCHEDULE_PROXY_SECRET;
  const targetUrl = useProxy
    ? `${SCHEDULE_PROXY_URL}?url=${encodeURIComponent(url)}`
    : url;

  const response = await fetch(targetUrl, {
    headers: useProxy
      ? { "X-Proxy-Secret": SCHEDULE_PROXY_SECRET }
      : {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          Referer: AKGUNLER_SCHEDULE_URL,
        },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Sefer takvimi kaynağı alınamadı: HTTP ${response.status}`);
  }

  return response.text();
}

const ANTSO_ROUTE_MOD = "61";

export async function getFerrySchedule(routeSlug?: string): Promise<SchedulePayload> {
  const landingHtml = await fetchHtml(AKGUNLER_SCHEDULE_URL);
  const allRoutes = parseRoutes(landingHtml);
  const routes = allRoutes.filter((route) => route.mod === ANTSO_ROUTE_MOD);
  const selectedRoute =
    routes.find((route) => route.slug === routeSlug) ??
    routes[0] ??
    null;

  if (!selectedRoute) {
    return {
      sourceUrl: AKGUNLER_SCHEDULE_URL,
      selectedRoute: null,
      routes: [],
      directions: [],
      days: [],
    };
  }

  const detailHtml = await fetchHtml(selectedRoute.href);
  const directions = parseDirectionsFromTitle(selectedRoute.title);
  const days = parseScheduleDays(detailHtml, directions);

  return {
    sourceUrl: selectedRoute.href,
    selectedRoute,
    routes,
    directions,
    days,
  };
}
