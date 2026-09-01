import { getTodos } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { AddTodoForm } from "./TodoForm";
import { setTodoDone, deleteTodo } from "./actions";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const allTodos = await getTodos();
  const active = allTodos.filter((t) => !t.done);
  const done = allTodos.filter((t) => t.done);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">To-do</h1>

        <Card>
          <AddTodoForm />
        </Card>

        <Card>
          {active.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing to do — nice.</p>
          ) : (
            <ul className="space-y-2">
              {active.map((todo) => (
                <li key={todo.id} className="flex items-center justify-between gap-3">
                  <form action={setTodoDone.bind(null, todo.id, true)} className="flex-1">
                    <button
                      type="submit"
                      className="w-full rounded-md border border-neutral-800 px-3 py-2 text-left text-sm text-neutral-300 hover:border-neutral-600"
                    >
                      {todo.text}
                    </button>
                  </form>
                  <form action={deleteTodo.bind(null, todo.id)}>
                    <button
                      type="submit"
                      aria-label="Delete to-do"
                      className="text-neutral-600 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {done.length > 0 && (
          <Card>
            <h2 className="mb-2 text-sm font-medium text-neutral-500">Done</h2>
            <ul className="space-y-2">
              {done.map((todo) => (
                <li key={todo.id} className="flex items-center justify-between gap-3">
                  <form action={setTodoDone.bind(null, todo.id, false)} className="flex-1">
                    <button
                      type="submit"
                      className="w-full rounded-md border border-neutral-800 px-3 py-2 text-left text-sm text-neutral-500 line-through hover:border-neutral-600"
                    >
                      {todo.text}
                    </button>
                  </form>
                  <form action={deleteTodo.bind(null, todo.id)}>
                    <button
                      type="submit"
                      aria-label="Delete to-do"
                      className="text-neutral-600 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
