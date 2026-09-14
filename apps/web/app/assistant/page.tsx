import { Suspense } from "react";
import { Entry } from "../../src/Entry";
export default function Page() {
  return (
    <Suspense>
      <Entry page="assistant" />
    </Suspense>
  );
}
