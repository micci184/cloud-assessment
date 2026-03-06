import { requireUser } from "@/lib/auth/guards";

import { CloudPractitionerSelectForm } from "./select-form";

const CloudPractitionerSelectPage = async (): Promise<React.ReactElement> => {
  await requireUser();

  return <CloudPractitionerSelectForm />;
};

export default CloudPractitionerSelectPage;
