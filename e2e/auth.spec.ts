import { expect, test, type Page } from "@playwright/test";

const createUniqueEmail = (prefix: string): string => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  return `${prefix}-${suffix}@example.com`;
};

const gotoSignupForm = async (page: Page): Promise<void> => {
  await page.goto("/login");
  await page.getByRole("button", { name: "新規登録" }).click();
  await expect(
    page.getByRole("heading", { name: "アカウント作成" }),
  ).toBeVisible();
};

const signup = async (
  page: Page,
  email: string,
  password: string,
): Promise<void> => {
  await gotoSignupForm(page);
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "アカウント作成" }).click();
};

const login = async (
  page: Page,
  email: string,
  password: string,
): Promise<void> => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
};

const logout = async (page: Page): Promise<void> => {
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
};

test("正常系: signup -> login -> logout", async ({ page }) => {
  const email = createUniqueEmail("auth-flow");
  const password = "ValidPass123";

  await signup(page, email, password);
  await expect(page).toHaveURL(/\/select$/);

  await logout(page);
  await login(page, email, password);
  await expect(page).toHaveURL(/\/select$/);
  await logout(page);
});

test("異常系: 重複メールでsignupするとエラーになる", async ({ page }) => {
  const email = createUniqueEmail("duplicate");
  const password = "ValidPass123";

  await signup(page, email, password);
  await expect(page).toHaveURL(/\/select$/);
  await logout(page);

  await signup(page, email, password);
  await expect(
    page.getByText("このメールアドレスは既に登録されています"),
  ).toBeVisible();
});

test("異常系: 誤パスワードでloginするとエラーになる", async ({ page }) => {
  const email = createUniqueEmail("wrong-password");
  const password = "ValidPass123";

  await signup(page, email, password);
  await expect(page).toHaveURL(/\/select$/);
  await logout(page);

  await login(page, email, "InvalidPass123");
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();
});

test("認証ガード: 未ログイン時は保護ページから/loginへ遷移する", async ({
  page,
}) => {
  await page.goto("/select");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/me");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/quiz/dummy-attempt-id");
  await expect(page).toHaveURL(/\/login$/);
});
