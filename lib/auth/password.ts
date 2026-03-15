import bcrypt from "bcryptjs";

const PASSWORD_SALT_ROUNDS = 12;

const DUMMY_HASH =
  "$2a$12$000000000000000000000uGHEwJqVdmYqYYJGsMgOBqEhFcMuOIi";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash);
};

export const verifyPasswordWithTimingSafety = async (
  password: string,
  passwordHash: string | null,
): Promise<boolean> => {
  return bcrypt.compare(password, passwordHash ?? DUMMY_HASH);
};
