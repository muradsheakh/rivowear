import { Suspense } from "react";
import View from "@/views/admin/AdminInvoices";

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
