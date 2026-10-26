import { redirect } from "next/navigation";

// To-do now lives at the top of the Lists page; this keeps old links and
// bookmarks working.
export default function TodoPage() {
  redirect("/lists");
}
