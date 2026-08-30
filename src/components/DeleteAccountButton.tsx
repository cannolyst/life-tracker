"use client";

import { deleteAccount } from "@/app/accounts/actions";

export function DeleteAccountButton({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const action = deleteAccount.bind(null, accountId);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete "${accountName}" and all its transactions? This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-900 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950"
      >
        Delete account
      </button>
    </form>
  );
}
