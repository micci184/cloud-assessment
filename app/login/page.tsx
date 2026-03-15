import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { LoginForm } from "./login-form";

const LoginPage = async (): Promise<React.ReactElement> => {
  const user = await getCurrentUser();

  if (user) {
    redirect("/select");
  }

  return <LoginForm />;
};

export default LoginPage;
