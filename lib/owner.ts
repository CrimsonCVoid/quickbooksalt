/**
 * Owner gate. OWNER_EMAIL may contain a single email or a comma-separated list,
 * so the same app can be logged into from a primary work email + a personal backup
 * (or vice versa) without having to share a single password.
 */
export function ownerEmails(): string[] {
  const raw = process.env.OWNER_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = ownerEmails();
  if (list.length === 0) return true; // no gate configured = open (intentional fallback)
  return list.includes(email.toLowerCase());
}
