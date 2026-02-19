import { requireUser } from "@/lib/auth/guards";

import { SelectForm } from "./select-form";

export default async function SelectPage() {
  await requireUser();

  return <SelectForm />;
}
