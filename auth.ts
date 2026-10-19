import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { adresseIp, connexionBloquee, effacerEchecs, noterEchec } from "@/lib/auth/limite";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const ip = adresseIp(request.headers);
        if (await connexionBloquee(email, ip)) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { employe: true },
        });
        if (!user || !user.actif || !user.employe.actif) {
          await noterEchec(email, ip);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await noterEchec(email, ip);
          return null;
        }
        await effacerEchecs(email);

        return {
          id: user.id,
          email: user.email,
          name: user.employe.prenom + " " + user.employe.nom,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});