// Server-only fetch for the SEO audit tool. Visitors choose the URL, so every request is guarded
// against SSRF: http(s) on ports 80/443 only, no credentials, no internal host names, and every
// resolved IP (checked at connect time, so DNS rebinding can't swap in an internal address) must be
// public. Redirects are followed by hand and re-validated; responses are capped in time and size.
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";
import zlib from "node:zlib";

const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) BLOCKED.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  // No ::ffff:0:0/96 rule: BlockList would apply it to every IPv4 address. Mapped addresses are unwrapped below.
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 23],
  ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) BLOCKED.addSubnet(net, prefix, "ipv6");

export const isPublicIp = (ip: string): boolean => {
  const family = isIP(ip);
  if (family === 4) return !BLOCKED.check(ip, "ipv4");
  if (family === 6) {
    // IPv4-mapped addresses (::ffff:a.b.c.d or ::ffff:7f00:1) are checked as the IPv4 address inside.
    const v6 = ip.toLowerCase();
    const dotted = v6.match(/^(?:0{0,4}:){0,5}:?ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPublicIp(dotted[1]);
    const hex = v6.match(/^(?:0{0,4}:){0,5}:?ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const [a, b] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
      return isPublicIp(`${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`);
    }
    return !BLOCKED.check(ip, "ipv6");
  }
  return false;
};

export class AuditFetchError extends Error {}

/** Validates a visitor-typed URL; adds https:// when the scheme is missing. */
export const normalizeUrl = (input: string): URL => {
  const raw = input.trim();
  if (!raw || raw.length > 500) throw new AuditFetchError("Please enter a website address.");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new AuditFetchError("That doesn't look like a website address.");
  }
  assertAllowed(url);
  url.hash = "";
  return url;
};

const assertAllowed = (url: URL) => {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new AuditFetchError("Only http and https addresses can be checked.");
  if (url.username || url.password) throw new AuditFetchError("Addresses with a username or password can't be checked.");
  if (url.port && !["80", "443"].includes(url.port)) throw new AuditFetchError("Only standard web ports (80 and 443) can be checked.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (!isPublicIp(host)) throw new AuditFetchError("Private or internal addresses can't be checked.");
    return;
  }
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|test|invalid|example)$/.test(host)) {
    throw new AuditFetchError("Please enter a public website address.");
  }
};

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** DNS lookup that refuses non-public addresses. Runs on every connection, including redirects. */
const safeLookup = (hostname: string, options: { all?: boolean; family?: number }, callback: LookupCallback) => {
  dnsLookup(hostname, { all: true, family: options.family ?? 0 }, (err, addresses) => {
    if (err) return callback(err, options.all ? [] : "");
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((a) => !isPublicIp(a.address))) {
      return callback(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }), options.all ? [] : "");
    }
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  });
};

export type FetchResult = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
  redirects: string[];
};

type Options = { maxBytes?: number; timeoutMs?: number; maxRedirects?: number; accept?: string };

const once = (url: URL, { maxBytes, timeoutMs, accept }: Required<Omit<Options, "maxRedirects">>, deadline: number) =>
  new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer; truncated: boolean }>((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: safeLookup as unknown as typeof dnsLookup,
        timeout: Math.max(1000, Math.min(timeoutMs, deadline - Date.now())),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HamzaTariqSEOAudit/1.0; +https://hamzatariq.site/tools/free-seo-audit)",
          Accept: accept,
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "en",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, headers: res.headers, body: Buffer.alloc(0), truncated: false });
        }
        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream =
          encoding === "gzip" ? res.pipe(zlib.createGunzip()) : encoding === "deflate" ? res.pipe(zlib.createInflate()) : encoding === "br" ? res.pipe(zlib.createBrotliDecompress()) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        stream.on("data", (chunk: Buffer) => {
          if (truncated) return;
          size += chunk.length;
          if (size > maxBytes) {
            truncated = true;
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
            req.destroy();
            resolve({ status, headers: res.headers, body: Buffer.concat(chunks), truncated: true });
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => !truncated && resolve({ status, headers: res.headers, body: Buffer.concat(chunks), truncated: false }));
        stream.on("error", (e) => !truncated && reject(e));
      },
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", reject);
    req.end();
  });

const friendly = (error: unknown) => {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === "EBLOCKED") return "Private or internal addresses can't be checked.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "That domain doesn't exist or has no DNS records.";
  if (code === "ETIMEDOUT" || code === "ECONNRESET") return "The website took too long to answer.";
  if (code === "ECONNREFUSED") return "The website refused the connection.";
  if (String(code ?? "").startsWith("ERR_TLS") || /certificate/i.test(String((error as Error)?.message))) return "The website's HTTPS certificate is not valid.";
  return "The website could not be reached.";
};

export const safeFetch = async (start: URL, options: Options = {}): Promise<FetchResult> => {
  const opts = {
    maxBytes: options.maxBytes ?? 2 * 1024 * 1024,
    timeoutMs: options.timeoutMs ?? 8000,
    accept: options.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
  };
  const maxRedirects = options.maxRedirects ?? 4;
  const deadline = Date.now() + opts.timeoutMs + 2000;
  const redirects: string[] = [];
  let url = start;
  for (let hop = 0; ; hop++) {
    assertAllowed(url);
    let res;
    try {
      res = await once(url, opts, deadline);
    } catch (error) {
      throw new AuditFetchError(friendly(error));
    }
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      if (hop >= maxRedirects) throw new AuditFetchError("The website redirects too many times.");
      url = new URL(String(res.headers.location), url);
      url.hash = "";
      redirects.push(url.toString());
      continue;
    }
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(", ") : String(v);
    return { url: url.toString(), status: res.status, headers, body: res.body.toString("utf8"), truncated: res.truncated, redirects };
  }
};
