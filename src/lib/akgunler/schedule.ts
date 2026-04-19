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

function parseScheduleDays(html: string, directions: string[]): ScheduleDay[] {
  const lines = toLines(html);
  const firstDateIndex = lines.findIndex((line) => /^\d{2}\/\d{2}\/\d{4}$/.test(line));
  if (firstDateIndex === -1) return [];

  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines.slice(firstDateIndex)) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(line) && current.length > 0) {
      blocks.push(current);
      current = [line];
      continue;
    }
    current.push(line);
  }

  if (current.length > 0) blocks.push(current);

  return blocks
    .map((block) => {
      const [date, weekdayLine, ...rest] = block;
      const weekday = (weekdayLine ?? "").split(/\s{2,}/)[0]?.trim() ?? "";
      const body = rest.join(" ").replace(/\s+/g, " ").trim();

      const tripMatches = Array.from(
        body.matchAll(/(\d{1,2}:\d{2})\s+([^0-9].*?)(?=(\d{1,2}:\d{2})|$)/g)
      );

      const trips = tripMatches.map((match, index) => ({
        direction: directions[index % directions.length] ?? directions[0] ?? "Sefer",
        time: match[1],
        vessel: match[2].trim(),
      }));

      return {
        date,
        weekday,
        trips,
      };
    })
    .filter((day) => day.trips.length > 0 || day.date.length > 0)
    .slice(0, 6);
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
