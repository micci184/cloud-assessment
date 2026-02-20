import { requireUser } from "@/lib/auth/guards";

import { MeDashboard } from "./me-dashboard";

const MePage = async (): Promise<React.ReactElement> => {
  await requireUser();

  return <MeDashboard />;
};

export default MePage;
