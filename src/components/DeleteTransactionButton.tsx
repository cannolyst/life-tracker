"use client";

export function DeleteTransactionButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this transaction?")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        aria-label="Delete transaction"
        className="text-neutral-600 hover:text-red-400"
      >
        ✕
      </button>
    </form>
  );
}
