import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Trusts `X-Forwarded-For` /
 * `X-Real-IP`, which the documented Nginx/Caddy reverse proxy setup (see
 * docs/deployment.md) is responsible for setting correctly — TableFlow
 * itself never sits directly on the public internet.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
