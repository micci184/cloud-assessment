export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  const requestOrigin = new URL(request.url).origin;

  return origin === requestOrigin;
}

export function isJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");

  return contentType?.includes("application/json") === true;
}
