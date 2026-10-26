import { Card } from "@/components/ui";
import { Sparkle } from "@/components/Sparkle";
import { jewelFor } from "@/lib/jewels";
import { AddTodoForm } from "./TodoForm";
import { setTodoDone, deleteTodo, clearCompletedTodos } from "./actions";

type Todo = { id: string; text: string; done: boolean };

// The to-do list, pinned to the top of the Lists page.
export function TodoSection({ todos }: { todos: Todo[] }) {
  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Sparkle className="h-4 w-4" color={jewelFor(0).color} />
        To-do
      </h2>

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
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-500">Done</h3>
            <form action={clearCompletedTodos}>
              <button type="submit" className="text-xs text-neutral-500 hover:text-red-400">
                Clear all
              </button>
            </form>
          </div>
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
    </section>
  );
}
