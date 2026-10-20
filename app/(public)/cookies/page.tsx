import type { Metadata } from "next";
import { PageLegale } from "@/components/legal/PageLegale";

export const metadata: Metadata = { title: "Politique cookies - GES Mali" };

// Inventaire tenu a jour a la main : GES Mali ne pose que les cookies d'Auth.js.
// En HTTPS, leurs noms sont prefixes par __Secure- ou __Host-.
const COOKIES = [
  {
    nom: "authjs.session-token",
    role: "Maintient la connexion du personnel (session chiffrée).",
    duree: "30 jours, ou jusqu'à la déconnexion",
  },
  {
    nom: "authjs.csrf-token",
    role: "Protège le formulaire de connexion contre les requêtes frauduleuses (CSRF).",
    duree: "Durée de la session du navigateur",
  },
  {
    nom: "authjs.callback-url",
    role: "Retient la page à afficher après la connexion.",
    duree: "Durée de la session du navigateur",
  },
  {
    nom: "gesmali-ecole",
    role: "Retient l'école choisie par une personne qui travaille dans plusieurs écoles.",
    duree: "1 an, ou jusqu'au choix d'une autre école",
  },
];

export default function CookiesPage() {
  return (
    <PageLegale titre="Politique cookies" actif="/cookies">
      <p>
        Un cookie est un petit fichier enregistré par votre navigateur. GES Mali n&apos;utilise que des
        cookies <strong>strictement nécessaires</strong> au fonctionnement de la connexion. Ils ne
        servent ni à la publicité, ni aux statistiques, ni au suivi de votre navigation, et aucun
        cookie de tiers n&apos;est déposé.
      </p>

      <h2>Cookies utilisés</h2>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Rôle</th><th>Durée</th></tr>
        </thead>
        <tbody>
          {COOKIES.map((c) => (
            <tr key={c.nom}>
              <td className="font-mono text-xs">{c.nom}</td>
              <td>{c.role}</td>
              <td>{c.duree}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Espace parent</h2>
      <p>
        La consultation de l&apos;espace parent par le lien ou le QR code ne dépose aucun cookie.
      </p>

      <h2>Consentement</h2>
      <p>
        Ces cookies étant indispensables au service, ils ne nécessitent pas de consentement préalable.
        Vous pouvez les supprimer ou les bloquer dans les réglages de votre navigateur ; la connexion à
        l&apos;espace du personnel ne fonctionnera alors plus.
      </p>

      <h2>Polices de caractères</h2>
      <p>
        Les polices utilisées sont intégrées à l&apos;application : leur affichage n&apos;entraîne aucune
        connexion à un service tiers.
      </p>
    </PageLegale>
  );
}
