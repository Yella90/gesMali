import type { Metadata } from "next";
import Link from "next/link";
import { PageLegale } from "@/components/legal/PageLegale";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions d'utilisation - GES Mali" };

export default function ConditionsUtilisationPage() {
  return (
    <PageLegale titre="Conditions générales d'utilisation" actif="/conditions-utilisation">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions encadrent l&apos;utilisation de GES Mali, application de gestion
        d&apos;établissement scolaire (élèves, classes, notes, bulletins, frais de scolarité, personnel)
        et de son espace parent. Utiliser l&apos;application vaut acceptation de ces conditions.
      </p>

      <h2>2. Éditeur et hébergement</h2>
      <ul>
        <li>Éditeur : {LEGAL.editeur}, {LEGAL.adresse}, {LEGAL.email}, {LEGAL.telephone}.</li>
        <li>Application hébergée par : {LEGAL.hebergeurApplication}.</li>
        <li>Données hébergées par : {LEGAL.hebergeurBase}.</li>
      </ul>

      <h2>3. Utilisateurs et accès</h2>
      <ul>
        <li>
          <strong>Personnel de l&apos;établissement</strong> (direction, secrétariat, comptabilité,
          enseignants) : accès par compte nominatif créé par l&apos;établissement. Chaque rôle n&apos;accède
          qu&apos;aux fonctions qui lui sont attribuées.
        </li>
        <li>
          <strong>Parents et tuteurs</strong> : accès en lecture seule à l&apos;espace de leur enfant, par le
          lien ou le QR code personnel remis par l&apos;établissement (fiche d&apos;inscription).
        </li>
      </ul>

      <h2>4. Engagements des utilisateurs</h2>
      <ul>
        <li>Garder ses identifiants et son lien d&apos;accès parent confidentiels ; ne pas les partager.</li>
        <li>Signaler sans délai à l&apos;établissement toute perte, fuite ou utilisation suspecte. Le lien parent peut alors être remplacé et l&apos;ancien désactivé.</li>
        <li>Saisir des informations exactes et n&apos;utiliser les données consultées que pour la scolarité de l&apos;élève ou la mission de l&apos;établissement.</li>
        <li>Ne pas tenter d&apos;accéder à des données ou fonctions non autorisées, ni de perturber le service.</li>
      </ul>

      <h2>5. Responsabilités</h2>
      <p>
        L&apos;établissement scolaire est responsable des informations qu&apos;il saisit (notes, bulletins,
        frais, décisions) et de la gestion des comptes de son personnel. Les notes et bulletins affichés
        dans l&apos;espace parent sont fournis à titre d&apos;information ; en cas de différence, le document
        officiel délivré par l&apos;établissement fait foi.
      </p>
      <p>
        L&apos;éditeur met en œuvre des moyens raisonnables pour assurer la disponibilité et la sécurité du
        service, sans garantie d&apos;absence d&apos;interruption (maintenance, panne réseau ou de
        l&apos;hébergeur).
      </p>

      <h2>6. Données personnelles et cookies</h2>
      <p>
        Le traitement des données est décrit dans la{" "}
        <Link href="/confidentialite" className="text-[var(--color-brand)] underline">politique de confidentialité</Link>{" "}
        et l&apos;usage des cookies dans la{" "}
        <Link href="/cookies" className="text-[var(--color-brand)] underline">politique cookies</Link>.
      </p>

      <h2>7. Suspension de l&apos;accès</h2>
      <p>
        L&apos;établissement peut désactiver un compte ou remplacer un lien parent à tout moment, notamment
        en cas de départ, de radiation ou de transfert d&apos;un élève, ou d&apos;usage contraire aux présentes
        conditions.
      </p>

      <h2>8. Modification et droit applicable</h2>
      <p>
        Ces conditions peuvent être mises à jour ; la date de mise à jour figure en haut de la page.
        Elles sont régies par le droit malien. À défaut d&apos;accord amiable, tout litige relève des
        juridictions compétentes de Bamako.
      </p>
    </PageLegale>
  );
}
