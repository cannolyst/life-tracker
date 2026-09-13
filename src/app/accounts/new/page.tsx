import { Nav } from "@/components/Nav";
import { NewAccountForm } from "./NewAccountForm";

export default function NewAccountPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold">New account</h1>
        <NewAccountForm />
      </main>
    </div>
  );
}
