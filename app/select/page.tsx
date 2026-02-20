import { requireUser } from "@/lib/auth/guards";

import { SelectForm } from "./select-form";

const SelectPage = async (): Promise<React.ReactElement> => {
  await requireUser();

  return <SelectForm />;
};

export default SelectPage;
