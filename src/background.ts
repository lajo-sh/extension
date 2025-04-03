import axios from "axios";
import Dexie from "dexie";
import { getDomainAndSubdomain } from "./lib/getDomainAndSubdomain";

const BASE_URL = PRODUCTION
  ? "https://api.lajosh.com"
  : "http://localhost:3000";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface WhitelistItem {
  domain: string;
}

class PhishingDatabase extends Dexie {
  whitelist!: Dexie.Table<WhitelistItem, string>;

  constructor() {
    super("phishing");
    this.version(1).stores({
      whitelist: "domain",
    });
  }
}

const db = new PhishingDatabase();

try {
  db.version(1).stores({
    whitelist: "domain",
  });
} catch (error) {
  console.error("Failed to initialize database schema:", error);
}

/**
 * Updates the whitelist database with domains from various sources.
 */
async function updateWhitelist() {
  try {
    const lists: string[] = [
      "https://raw.githubusercontent.com/lajo-sh/whitelist/refs/heads/main/top-domains.txt",
      "https://raw.githubusercontent.com/lajo-sh/whitelist/refs/heads/main/croatian-lists.txt",
    ];
    let domains: string[] = [];

    for (const list of lists) {
      try {
        const { data } = await axios.get(list, {
          timeout: 5000,
          validateStatus: (status) => status === 200,
        });

        if (typeof data === "string") {
          domains = domains.concat(
            data
              .split("\n")
              .map((line: string) => line.trim())
              .filter(Boolean),
          );
        } else {
          console.warn(`Invalid whitelist data format from ${list}`);
        }
      } catch (error) {
        console.error(`Failed to fetch whitelist from ${list}:`, error);
      }
    }

    try {
      await db.whitelist.clear();

      if (domains.length > 0) {
        await db.whitelist.bulkAdd(
          domains.map((domain: string) => ({ domain })),
        );
      }
    } catch (dbError) {
      console.error("Failed to update whitelist database:", dbError);
    }
  } catch (error) {
    console.error("Error in updateWhitelist:", error);
  }
}

updateWhitelist().catch((error) => {
  console.error("Initial whitelist update failed:", error);
});

/**
 * Extracts the domain from a URL.
 * @param url - The URL to extract the domain from.
 * @returns The extracted domain, or the original URL if extraction fails.
 */
function extractDomain(url: string): string {
  try {
    const urlObject = new URL(url);
    const hostnameParts = urlObject.hostname.split(".");

    if (
      hostnameParts.length < 2 ||
      hostnameParts.every((part) => !Number.isNaN(Number(part)))
    ) {
      return urlObject.hostname;
    }

    return hostnameParts.slice(-2).join(".");
  } catch (error) {
    console.error("Error extracting domain:", error);
    return url;
  }
}

/**
 * Strips the protocol from a URL, returning the hostname and pathname.
 * @param url - The URL to strip the protocol from.
 * @returns The URL without the protocol, or the original URL if stripping fails.
 */
function stripProtocol(url: string): string {
  try {
    const urlObject = new URL(url);
    return `${urlObject.hostname}${urlObject.pathname}`;
  } catch (error) {
    console.error("Error stripping protocol:", error);
    return url;
  }
}

interface CacheEntry {
  confidence: number;
  isPhishing: boolean;
  timestamp: number;
  explanation?: string;
  code?: string;
}

const CACHE_EXPIRY_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Checks the local storage cache for a phishing check result for a given domain.
 * @param domain - The domain to check in the cache.
 * @returns The cached entry if found and not expired, otherwise null.
 */
async function checkCache(domain: string): Promise<CacheEntry | null> {
  try {
    if (!PRODUCTION) {
      return null;
    }

    if (!domain) {
      console.error("Invalid domain passed to checkCache");
      return null;
    }

    const cacheKey = `phishing_check_${domain}`;

    try {
      const result = await chrome.storage.local.get(cacheKey);
      const cached = result[cacheKey] as CacheEntry | undefined;

      if (cached) {
        const now = Date.now();

        if (now - cached.timestamp < CACHE_EXPIRY_DAYS * MS_PER_DAY) {
          return cached;
        }

        try {
          await chrome.storage.local.remove(cacheKey);
        } catch (storageError) {
          console.error("Failed to remove expired cache entry:", storageError);
        }
      }
    } catch (storageError) {
      console.error("Storage access error:", storageError);
    }

    return null;
  } catch (error) {
    console.error("Unexpected error in checkCache:", error);
    return null;
  }
}

interface PhishingCheckResponse {
  isPhishing: boolean;
  code?: string;
  explanation?: string;
  visitedBefore?: boolean;
  confidence?: number; // Add confidence to the interface
}

/**
 * Makes an API request with retry logic.
 * @param url - The URL to make the request to.
 * @param method - The HTTP method to use.
 * @param data - The request data (for POST requests).
 * @param headers - The request headers.
 * @param retryCount - The current retry count.
 * @returns The response data.
 * @throws If the API request fails after all retries.
 */
async function apiRequestWithRetry(
  url: string,
  method: "get" | "post",
  data: Record<string, unknown> | null = null,
  headers: Record<string, string> = {},
  retryCount = 0,
): Promise<unknown> {
  try {
    const config = {
      headers,
      timeout: 10000,
    };

    if (method === "get") {
      const response = await axios.get(url, config);
      return response.data;
    }

    const response = await axios.post(url, data, config);
    return response.data;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(
        `API request failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`,
      );

      const delay = RETRY_DELAY * 2 ** retryCount;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return apiRequestWithRetry(url, method, data, headers, retryCount + 1);
    }

    console.error("API request failed after retries:", error);
    throw error;
  }
}

chrome.webNavigation.onCompleted.addListener(async (details) => {
  try {
    chrome.storage.local.get(
      ["active", "token", "requiredConfidence"],
      async (result) => {
        try {
          if (!result.active || !result.token) {
            return;
          }

          const requiredConfidence: number =
            Number.parseFloat(result.requiredConfidence) || 0.8;
          const url = details.url;

          if (
            !url ||
            (!url.startsWith("http://") && !url.startsWith("https://"))
          ) {
            return;
          }

          if (
            url.startsWith("chrome://") ||
            url.startsWith("chrome-extension://") ||
            url.startsWith("moz-extension://") ||
            url.startsWith("about:")
          ) {
            return;
          }

          const strippedUrl = stripProtocol(url);

          try {
            const cached = await checkCache(strippedUrl);

            if (cached) {
              if (
                cached.isPhishing &&
                cached.confidence >= requiredConfidence
              ) {
                try {
                  chrome.tabs.update(details.tabId, {
                    url: `${chrome.runtime.getURL("pages/blocked.html")}?url=${encodeURIComponent(url)}&code=${cached.code}&confidence=${cached.confidence}`,
                  });
                } catch (navigationError) {
                  console.error(
                    "Failed to navigate to blocked page:",
                    navigationError,
                  );
                }
              }
              return;
            }
          } catch (cacheError) {
            console.error("Cache check failed:", cacheError);
          }

          try {
            const domain = extractDomain(url);
            const whitelist = await db.whitelist.get(domain);

            if (whitelist) {
              return;
            }
          } catch (whitelistError) {
            console.error("Whitelist check failed:", whitelistError);
          }

          const whitelisted = await chrome.storage.session.get(
            `whitelist-${getDomainAndSubdomain(url)}`,
          );

          console.log(getDomainAndSubdomain(url));

          if (whitelisted[`whitelist-${getDomainAndSubdomain(url)}`]) {
            return;
          }

          try {
            const response = await apiRequestWithRetry(
              `${BASE_URL}/check-phishing`,
              "post",
              { url: strippedUrl },
              { Authorization: `Bearer ${result.token}` },
            );

            const data = response as PhishingCheckResponse;
            if (typeof data.isPhishing !== "boolean") {
              throw new Error("Invalid API response format");
            }

            const confidence = data.confidence || 0;

            try {
              await chrome.storage.local.set({
                [`phishing_check_${strippedUrl}`]: {
                  isPhishing: data.isPhishing,
                  timestamp: Date.now(),
                  explanation: data.explanation,
                  confidence: confidence,
                  code: data.code,
                },
              });
            } catch (storageError) {
              console.error("Failed to save to cache:", storageError);
            }

            if (!data.isPhishing || confidence < requiredConfidence) {
              if (!data.visitedBefore) {
                await chrome.storage.session.set({
                  [`visited-before-${getDomainAndSubdomain(url)}`]: true,
                });
              }
              return;
            }

            try {
              if (data.code) {
                const base64 = btoa(data.code);

                let blockedUrl = `${chrome.runtime.getURL("pages/blocked.html")}?url=${encodeURIComponent(url)}&code=${base64}&confidence=${confidence}`;

                if (data.explanation) {
                  blockedUrl += `&explanation=${encodeURIComponent(data.explanation)}`;
                }

                chrome.tabs.update(details.tabId, { url: blockedUrl });

                return;
              }

              let blockedUrl = `${chrome.runtime.getURL("pages/blocked.html")}?url=${encodeURIComponent(url)}`;

              if (data.explanation) {
                blockedUrl += `&explanation=${encodeURIComponent(data.explanation)}`;
              }

              chrome.tabs.update(details.tabId, { url: blockedUrl });
            } catch (navigationError) {
              console.error(
                "Failed to navigate to blocked page:",
                navigationError,
              );

              try {
                chrome.tabs.create({
                  url: chrome.runtime.getURL("pages/blocked.html"),
                  active: true,
                });
              } catch (fallbackError) {
                console.error(
                  "Fallback navigation also failed:",
                  fallbackError,
                );
              }
            }
          } catch (apiError) {
            console.error("Failed to check if URL is phishing:", apiError);
          }
        } catch (innerError) {
          console.error("Error in webNavigation handler:", innerError);
        }
      },
    );
  } catch (outerError) {
    console.error("Fatal error in webNavigation listener:", outerError);
  }
});

setInterval(
  () => {
    try {
      updateWhitelist();
    } catch (error) {
      console.error("Periodic whitelist update failed:", error);
    }
  },
  24 * 60 * 60 * 1000,
);
