import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { isIP } from "node:net";
import { Agent, type Dispatcher } from "undici";

/**
 * SSRF protection.
 *
 * The naive approach — resolve the hostname, validate the IP, then issue the
 * request — is vulnerable to DNS rebinding: the attacker's DNS server can
 * return a public IP for the validation lookup and a private IP for the
 * connection lookup.
 *
 * We close that gap by validating the resolved address *inside* the
 * connection-time `lookup` callback. Whatever IP `lookup` yields is the IP
 * undici connects to, and we reject it there before the socket opens.
 */

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/**
 * Parse an IPv4 dotted-quad into four octets, or return null.
 */
function parseIpv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return octets as [number, number, number, number];
}

const IPV4_BLOCKED_RANGES: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (incl. cloud metadata 169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
  ["255.255.255.255", 32], // broadcast
];

function ipv4ToInt(ip: string): number | null {
  const octets = parseIpv4(ip);
  if (!octets) return null;
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function inIpv4Range(ip: string, base: string, prefix: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function isBlockedIpv4(ip: string): boolean {
  return IPV4_BLOCKED_RANGES.some(([base, prefix]) => inIpv4Range(ip, base, prefix));
}

/**
 * Expand an IPv6 address into its 8 groups of 16-bit values.
 * Handles `::` compression and embedded IPv4 (`::ffff:1.2.3.4`).
 */
function expandIpv6(ip: string): number[] | null {
  // Strip zone id (fe80::1%eth0).
  const zoneIndex = ip.indexOf("%");
  const clean = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);

  // Handle embedded IPv4 tail.
  let head = clean;
  let embeddedV4: number[] = [];
  if (clean.includes(".")) {
    const lastColon = clean.lastIndexOf(":");
    if (lastColon === -1) return null;
    const v4 = parseIpv4(clean.slice(lastColon + 1));
    if (!v4) return null;
    embeddedV4 = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]];
    head = clean.slice(0, lastColon + 1);
  }

  const doubleColon = head.indexOf("::");
  let groups: number[];

  const parseGroups = (segment: string): number[] | null => {
    if (segment === "") return [];
    const out: number[] = [];
    for (const g of segment.split(":")) {
      if (g === "") continue;
      const value = Number.parseInt(g, 16);
      if (!Number.isInteger(value) || value < 0 || value > 0xffff) return null;
      out.push(value);
    }
    return out;
  };

  if (doubleColon !== -1) {
    const left = parseGroups(head.slice(0, doubleColon));
    const right = parseGroups(head.slice(doubleColon + 2));
    if (left === null || right === null) return null;
    const missing = 8 - left.length - right.length - embeddedV4.length;
    if (missing < 0) return null;
    groups = [...left, ...new Array<number>(missing).fill(0), ...right, ...embeddedV4];
  } else {
    const parsed = parseGroups(head);
    if (parsed === null) return null;
    groups = [...parsed, ...embeddedV4];
  }

  return groups.length === 8 ? groups : null;
}

function isBlockedIpv6(ip: string): boolean {
  const groups = expandIpv6(ip);
  if (!groups) return true; // Unparseable → fail closed.

  const g0 = groups[0] ?? 0;
  const g1 = groups[1] ?? 0;
  const g2 = groups[2] ?? 0;
  const g3 = groups[3] ?? 0;
  const g4 = groups[4] ?? 0;
  const g5 = groups[5] ?? 0;
  const g6 = groups[6] ?? 0;
  const g7 = groups[7] ?? 0;

  // ::1 loopback
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0 && g6 === 0 && g7 === 1) {
    return true;
  }
  // :: unspecified
  if (groups.every((g) => g === 0)) return true;

  // IPv4-mapped ::ffff:a.b.c.d — validate the embedded IPv4.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    const v4 = `${(g6 >> 8) & 0xff}.${g6 & 0xff}.${(g7 >> 8) & 0xff}.${g7 & 0xff}`;
    return isBlockedIpv4(v4);
  }

  // Unique local addresses fc00::/7
  if ((g0 & 0xfe00) === 0xfc00) return true;
  // Link-local fe80::/10
  if ((g0 & 0xffc0) === 0xfe80) return true;
  // Multicast ff00::/8
  if ((g0 & 0xff00) === 0xff00) return true;
  // Documentation 2001:db8::/32
  if (g0 === 0x2001 && g1 === 0x0db8) return true;

  return false;
}

/** True when the literal IP is in a range we refuse to connect to. */
export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // Not a valid IP → fail closed.
}

interface LookupOptionsInput {
  all?: boolean;
  family?: number | "IPv4" | "IPv6";
  hints?: number;
  verbatim?: boolean;
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

/**
 * A connection-time `lookup` implementation that validates every resolved
 * address and refuses private / loopback / metadata targets.
 *
 * Exported for unit testing with an injectable resolver.
 */
export function createGuardedLookup(
  resolver: typeof dnsLookup = dnsLookup,
): (hostname: string, options: LookupOptionsInput, callback: LookupCallback) => void {
  return (hostname, options, callback) => {
    const familyNum =
      options.family === "IPv4" ? 4 : options.family === "IPv6" ? 6 : (options.family ?? 0);
    resolver(hostname, { all: true, family: familyNum }, (err, addresses) => {
      if (err) {
        callback(err, "");
        return;
      }
      const list: LookupAddress[] = Array.isArray(addresses)
        ? addresses
        : [{ address: addresses, family: isIP(addresses) }];
      const safe: LookupAddress[] = [];
      for (const entry of list) {
        const address = entry.address;
        if (isBlockedIp(address)) {
          callback(new SsrfError(`Заблокированный адрес: ${address}`), "");
          return;
        }
        safe.push({ address, family: isIP(address) === 6 ? 6 : 4 });
      }
      if (safe.length === 0) {
        callback(new SsrfError("Не удалось разрешить адрес"), "");
        return;
      }
      callback(null, safe);
    });
  };
}

/**
 * undici Agent whose connections are validated at DNS-resolution time.
 * Reused across all checks for keep-alive.
 */
export function createSafeAgent(): Dispatcher {
  return new Agent({
    connect: {
      lookup: createGuardedLookup(),
    },
    keepAliveTimeout: 10_000,
    keepAliveMaxTimeout: 60_000,
    connections: 32,
  });
}

/** Shared agent instance for the whole process. */
let sharedAgent: Dispatcher | null = null;

export function getSafeAgent(): Dispatcher {
  if (!sharedAgent) {
    sharedAgent = createSafeAgent();
  }
  return sharedAgent;
}

/**
 * Pre-flight check on a URL: protocol + literal-IP host validation.
 * This does NOT replace the connection-time guard; it catches the obvious
 * cases early and gives a clearer error message.
 */
export function assertUrlAllowed(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Недопустимый протокол: ${url.protocol}`);
  }
  const host = url.hostname;
  // Strip IPv6 brackets already handled by URL.hostname (no brackets).
  const literalVersion = isIP(host);
  if (literalVersion !== 0 && isBlockedIp(host)) {
    throw new SsrfError(`Заблокированный адрес: ${host}`);
  }
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new SsrfError("localhost запрещён");
  }
}