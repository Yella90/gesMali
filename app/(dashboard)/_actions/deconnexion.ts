"use server";

import { signOut } from "@/auth";

export async function deconnexion() {
  await signOut({ redirectTo: "/login" });
}