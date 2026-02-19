import { requireUser } from "@/lib/auth/guards";

import { MeDashboard } from "./me-dashboard";

export default async function MePage() {
  await requireUser();

  return <MeDashboard />;
}
