/**
 * Shared helpers for onboarding route construction and query-parameter parsing,
 * supporting both initial school onboarding and additional ("Register New School")
 * onboarding without disrupting an existing admin session.
 */

export interface OnboardingRouteOptions {
  isNewSchool?: boolean;
  schoolId?: string | null;
}

export function buildOnboardingUrl(
  basePath: string,
  options?: OnboardingRouteOptions
): string {
  const params = new URLSearchParams();
  if (options?.isNewSchool) {
    params.set("mode", "new");
  }
  if (options?.schoolId) {
    params.set("schoolId", options.schoolId);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function parseOnboardingSearchParams(
  searchParams: URLSearchParams,
  forceNewSchool = false
): {
  isNewSchoolMode: boolean;
  targetSchoolId: string | null;
} {
  const mode = searchParams.get("mode");
  const schoolId = searchParams.get("schoolId");
  return {
    isNewSchoolMode: Boolean(forceNewSchool || mode === "new"),
    targetSchoolId: schoolId && schoolId.trim() ? schoolId.trim() : null,
  };
}
