export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_RULES = [
  "8文字以上",
  "英大文字を1文字以上",
  "英小文字を1文字以上",
  "数字を1文字以上",
] as const;

export const hasUppercase = (password: string): boolean => {
  return /[A-Z]/.test(password);
};

export const hasLowercase = (password: string): boolean => {
  return /[a-z]/.test(password);
};

export const hasDigit = (password: string): boolean => {
  return /[0-9]/.test(password);
};

export const isPasswordPolicySatisfied = (password: string): boolean => {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    hasUppercase(password) &&
    hasLowercase(password) &&
    hasDigit(password)
  );
};

export const getPasswordPolicyErrorMessage = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "パスワードは8文字以上で入力してください";
  }

  if (!hasUppercase(password)) {
    return "パスワードには英大文字を1文字以上含めてください";
  }

  if (!hasLowercase(password)) {
    return "パスワードには英小文字を1文字以上含めてください";
  }

  if (!hasDigit(password)) {
    return "パスワードには数字を1文字以上含めてください";
  }

  return null;
};
