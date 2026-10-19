import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { chargerCompte } from "@/lib/auth/comptes";
import { estAdministrateurPlateforme } from "@/lib/plateforme/etat";
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

        // Compte actif, avec au moins un acces actif (une ecole suspendue est expliquee
        // apres la connexion, sur la page de choix d'ecole), ou administrateur de la plateforme
        const user = await chargerCompte({ email });
        const accesActif = user?.acces.find((a) => a.actif && a.employe.actif);
        if (!user || !user.actif || !(accesActif || estAdministrateurPlateforme(user.email))) {
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
          name: accesActif ? accesActif.employe.prenom + " " + accesActif.employe.nom : user.email,
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