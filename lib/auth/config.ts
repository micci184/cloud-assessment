export const getAuthSecret = (): string => {
  const authSecret = process.env["AUTH_SECRET"];

  if (!authSecret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return authSecret;
};
