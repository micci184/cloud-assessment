import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

const Home = async () => {
  const user = await getCurrentUser();
  redirect(user ? "/select" : "/login");
};

export default Home;
