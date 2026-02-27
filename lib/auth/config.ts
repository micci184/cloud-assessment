const MIN_AUTH_SECRET_LENGTH = 32;

export const getAuthSecret = (): string => {
  const authSecret = process.env["AUTH_SECRET"];

  if (!authSecret) {
    throw new Error("AUTH_SECRET is not set");
  }

  if (authSecret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters long`,
    );
  }

  return authSecret;
};
