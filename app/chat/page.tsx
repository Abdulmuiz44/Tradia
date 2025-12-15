import { redirect } from "next/navigation";

export default function ChatPage() {
  // Redirect to the trades chat page with full context
  redirect("/dashboard/trades/chat");
}
