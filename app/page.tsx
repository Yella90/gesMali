import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}