// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  // server-side redirect to /login
  redirect("/login");
}
