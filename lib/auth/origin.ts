export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  const requestOrigin = new URL(request.url).origin;

  return origin === requestOrigin;
}
