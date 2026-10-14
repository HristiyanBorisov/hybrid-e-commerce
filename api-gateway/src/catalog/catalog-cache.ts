/** How long a product response stays cached — a safety net only: every catalog or stock change clears the cache */
export const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

/** A search answered by the database because Elasticsearch couldn't is a stand-in: it's cached only this long */
export const SEARCH_FALLBACK_CACHE_TTL_MS = 10 * 1000;
