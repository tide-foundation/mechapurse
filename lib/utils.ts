export function parseCookies(cookieHeader: string = ""): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...v] = c.split("=");
      return [key, v.join("=")];
    })
  );
}