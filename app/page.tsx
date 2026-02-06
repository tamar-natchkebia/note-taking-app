// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  // Server-side redirect to /login
  redirect("/login");
}
