const PRODUCTION_SITE_ORIGIN = "https://req-sand.vercel.app";

function normalizedOrigin(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return "";
  }
}

function isLocalOrigin(origin: string) {
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isVercelOrigin(origin: string) {
  return new URL(origin).hostname.endsWith(".vercel.app");
}

export function canonicalSiteOrigin(
  currentOrigin?: string,
  configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL,
) {
  const configured = normalizedOrigin(configuredOrigin);
  const current = normalizedOrigin(currentOrigin);

  if (configured && isVercelOrigin(configured)) return PRODUCTION_SITE_ORIGIN;
  if (configured && !isLocalOrigin(configured)) return configured;
  if (current && isLocalOrigin(current)) return configured || current;
  if (current && isVercelOrigin(current)) return PRODUCTION_SITE_ORIGIN;
  return current || configured || PRODUCTION_SITE_ORIGIN;
}

export function passwordResetRedirectUrl(currentOrigin?: string) {
  return `${canonicalSiteOrigin(currentOrigin)}/reset-password`;
}
