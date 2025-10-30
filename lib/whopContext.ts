type AccessLevel = "admin" | "member" | "no_access";

type AdminContext = {
  companyId: string | null;      // biz_XXXX for the *current* install
  experienceId: string | null;   // xp_XXXX for the specific view instance
  userId: string | null;         // Whop user id (or decoded from signed token)
  accessLevel: AccessLevel;
  isAdmin: boolean;              // accessLevel === "admin"
  source: "headers" | "query" | "referer" | "experience_map" | "none";
  debug: {
    headers: Record<string, string | null>;
    referer: string | null;
    url: string;
  };
};

export async function resolveAdminContext(req: Request, sdk: any): Promise<AdminContext> {
  const url = new URL(req.url); const hdr = (k: string) => req.headers.get(k) || null;
  const debugHeaders = {
    "X-Whop-Company-Id": hdr("X-Whop-Company-Id"),
    "X-Whop-Experience-Id": hdr("X-Whop-Experience-Id"),
    "X-Whop-User-Id": hdr("X-Whop-User-Id"),
    "Whop-Signed-Token": hdr("Whop-Signed-Token"),
  };
  const referer = hdr("referer");
  const fromQuery = {
    companyId: url.searchParams.get("company_id"),
    experienceId: url.searchParams.get("experience_id"),
  };
  const fromHeaders = {
    companyId: debugHeaders["X-Whop-Company-Id"],
    experienceId: debugHeaders["X-Whop-Experience-Id"],
  };
  const fromReferer = (() => {
    if (!referer) return { companyId: null, experienceId: null };
    try {
      const r = new URL(referer);
      const companyId = r.searchParams.get("company_id")
        || (r.pathname.match(/\/companies\/(biz_[A-Za-z0-9]+)/)?.[1] ?? null);
      const experienceId = r.searchParams.get("experience_id")
        || (r.pathname.match(/\/experiences\/(xp_[A-Za-z0-9]+)/)?.[1] ?? null);
      return { companyId, experienceId };
    } catch { return { companyId: null, experienceId: null }; }
  })();

  let source: AdminContext["source"] = "none";
  let companyId = fromHeaders.companyId || fromQuery.companyId || fromReferer.companyId;
  let experienceId = fromHeaders.experienceId || fromQuery.experienceId || fromReferer.experienceId;
  if (fromHeaders.companyId || fromHeaders.experienceId) source = "headers";
  else if (fromQuery.companyId || fromQuery.experienceId) source = "query";
  else if (fromReferer.companyId || fromReferer.experienceId) source = "referer";

  // If only experience is known, map to company (SDK)
  if (!companyId && experienceId) {
    try {
      const exp = await sdk.experiences.get({ id: experienceId }); // or .retrieve
      companyId = exp?.company_id ?? null;
      if (companyId) source = "experience_map";
    } catch { /* ignore */ }
  }

  // Determine userId (prefer SDK verify if you decode a signed token)
  const userId = debugHeaders["X-Whop-User-Id"] /* or from your auth */;

  let accessLevel: AccessLevel = "no_access"; let isAdmin = false;
  if (companyId && userId) {
    try {
      const res = await sdk.access.checkIfUserHasAccessToCompany({ companyId, userId });
      accessLevel = (res?.accessLevel ?? "no_access") as AccessLevel;
      isAdmin = accessLevel === "admin";
    } catch { /* leave no_access */ }
  }

  return {
    companyId: companyId ?? null,
    experienceId: experienceId ?? null,
    userId: userId ?? null,
    accessLevel, isAdmin, source,
    debug: { headers: debugHeaders, referer, url: url.toString() },
  };
}