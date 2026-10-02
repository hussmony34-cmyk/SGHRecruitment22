import { timingSafeEqual } from "node:crypto";

export function authorizeHrRequest(request) {
  const configuredKey = process.env.HR_API_KEY;
  if (!configuredKey) return { allowed: false, unavailable: true };

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return { allowed: false, unavailable: false };

  const expected = Buffer.from(configuredKey);
  const supplied = Buffer.from(match[1]);
  return {
    allowed: expected.length === supplied.length && timingSafeEqual(expected, supplied),
    unavailable: false,
  };
}
