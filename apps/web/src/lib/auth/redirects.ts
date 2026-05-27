export function getSafeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
