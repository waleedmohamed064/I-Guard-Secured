const { stripTags } = require("../utils/text");

const SEARCH_BASE_URL = "https://ahmia.fi";

/**
 * ✅ Threat Score Engine
 * Returns a score from 1-10 based on how dangerous the content appears.
 * Used by cybersecurity analysts to prioritize investigation.
 */
function calculateThreatScore(title, description, category) {
  const haystack = `${title} ${description}`.toLowerCase();
  let score = 1;

  const criticalKeywords = [
    "ransomware", "zero-day", "0day", "exploit kit", "botnet",
    "ddos", "rootkit", "keylogger", "credential", "exfiltration",
  ];
  const highKeywords = [
    "malware", "stealer", "trojan", "phishing", "rat ", "loader",
    "hacking", "hack", "breach", "leak", "dump", "stolen",
  ];
  const mediumKeywords = [
    "drugs", "weapon", "counterfeit", "fraud", "carding",
    "darknet", "anonymous", "tor", "marketplace", "vendor",
  ];

  const criticalHits = criticalKeywords.filter((k) => haystack.includes(k)).length;
  const highHits = highKeywords.filter((k) => haystack.includes(k)).length;
  const mediumHits = mediumKeywords.filter((k) => haystack.includes(k)).length;

  score += Math.min(criticalHits * 3, 6);
  score += Math.min(highHits * 2, 4);
  score += Math.min(mediumHits * 1, 2);

  if (category === "Malware") score += 2;
  else if (category === "Marketplace") score += 1;

  return Math.min(Math.max(Math.round(score), 1), 10);
}

function categorizeResult(title, description) {
  const haystack = `${title} ${description}`.toLowerCase();

  const malwareKeywords = ["malware","ransomware","stealer","botnet","exploit","phishing","loader","rat ","trojan"];
  const marketplaceKeywords = ["market","marketplace","shop","vendor","sell","buy","store","drugs","escrow"];
  const forumKeywords = ["forum","board","community","discussion","thread","message board"];

  if (malwareKeywords.some((k) => haystack.includes(k))) return "Malware";
  if (marketplaceKeywords.some((k) => haystack.includes(k))) return "Marketplace";
  if (forumKeywords.some((k) => haystack.includes(k))) return "Forum";
  return "Other";
}

function absoluteUrl(href) {
  try {
    return new URL(href, SEARCH_BASE_URL).toString();
  } catch (error) {
    return href;
  }
}

function parseSearchResults(html) {
  const results = [];
  const resultBlocks = html.match(/<li[^>]*class="[^"]*result[^"]*"[\s\S]*?<\/li>/gi) || [];

  for (const block of resultBlocks) {
    const titleMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const descriptionMatch =
      block.match(/<p[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
      block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const onionMatch = block.match(/([a-z2-7]{16,56}\.onion)/i);
    const lastSeenMatch = block.match(/Last seen[:\s]*<\/?[^>]*>\s*([^<]+)/i);

    const title = stripTags(titleMatch[2]);
    const description = descriptionMatch ? stripTags(descriptionMatch[1]) : "";
    const onion = onionMatch ? onionMatch[1] : "";
    const last_seen = lastSeenMatch ? stripTags(lastSeenMatch[1]) : "";
    const category = categorizeResult(title, description);

    results.push({
      title, description,
      link: absoluteUrl(titleMatch[1]),
      onion, category,
      threatScore: calculateThreatScore(title, description, category),
      last_seen,
    });
  }

  if (results.length > 0) return results;

  const genericBlocks =
    html.match(/<article[\s\S]*?<\/article>/gi) ||
    html.match(/<div[^>]*class="[^"]*(?:result|search-result)[^"]*"[\s\S]*?<\/div>/gi) ||
    [];

  for (const block of genericBlocks) {
    const titleMatch =
      block.match(/<h[1-6][^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-6]>/i) ||
      block.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/i);

    if (!titleMatch) continue;

    const paragraphMatches = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    const description = paragraphMatches.length > 0 ? stripTags(paragraphMatches[0][1]) : "";
    const onionMatch = block.match(/([a-z2-7]{16,56}\.onion)/i);
    const lastSeenMatch = block.match(/Last seen[:\s]*([^<]+)/i);
    const title = stripTags(titleMatch[2]);
    const category = categorizeResult(title, description);

    results.push({
      title, description,
      link: absoluteUrl(titleMatch[1]),
      onion: onionMatch ? onionMatch[1] : "",
      category,
      threatScore: calculateThreatScore(title, description, category),
      last_seen: lastSeenMatch ? stripTags(lastSeenMatch[1]) : "",
    });
  }

  return results;
}

async function fetchSearchToken() {
  const response = await fetch(`${SEARCH_BASE_URL}/`, {
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) throw new Error("Failed to load Ahmia homepage.");

  const html = await response.text();
  const tokenMatch = html.match(/<input type="hidden" name="([^"]+)" value="([^"]+)"/i);

  if (!tokenMatch) throw new Error("Failed to extract Ahmia search token.");

  return { name: tokenMatch[1], value: tokenMatch[2] };
}

async function fetchAhmiaResults(query) {
  const token = await fetchSearchToken();
  const searchUrl = new URL(`${SEARCH_BASE_URL}/search/`);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set(token.name, token.value);

  const response = await fetch(searchUrl, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      referer: `${SEARCH_BASE_URL}/`,
    },
  });

  if (!response.ok) throw new Error(`Ahmia request failed with status ${response.status}.`);

  const html = await response.text();
  const results = parseSearchResults(html);

  if (results.length === 0) throw new Error("Search provider returned no parseable results.");

  return results;
}

module.exports = { fetchAhmiaResults, calculateThreatScore };
