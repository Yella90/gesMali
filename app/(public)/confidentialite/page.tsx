import type { Metadata } from "next";
import Link from "next/link";
import { PageLegale } from "@/components/legal/PageLegale";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité - GES Mali" };

export default function ConfidentialitePage() {
  return (
    <PageLegale titre="Politique de confidentialité" actif="/confidentialite">
      <p>
        Cette politique explique quelles données personnelles sont traitées dans GES Mali, pourquoi,
        pendant combien de temps et quels sont vos droits, conformément à la loi n° 2013-015 du
        21 mai 2013 portant protection des données à caractère personnel en République du Mali.
      </p>

      <h2>1. Qui est responsable ?</h2>
      <ul>
        <li>
          <strong>Responsable du traitement</strong> : l&apos;établissement scolaire qui utilise GES Mali et
          auprès duquel l&apos;élève est inscrit. Ses coordonnées figurent sur la fiche d&apos;inscription et
          dans l&apos;espace parent.
        </li>
        <li>
          <strong>Sous-traitant</strong> : {LEGAL.editeur} ({LEGAL.email}), qui fournit et héberge
          l&apos;application pour le compte de l&apos;établissement et n&apos;utilise pas les données à
          d&apos;autres fins.
        </li>
        <li>
          <strong>Comptes de connexion et inscription des écoles</strong> : {LEGAL.editeur} est responsable des
          données de la plateforme elle-même (adresse e-mail et mot de passe des comptes, inscription d&apos;une école en
          ligne, e-mails de confirmation), utilisées seulement pour faire fonctionner le service.
        </li>
      </ul>
      <p>
        Plusieurs établissements utilisent GES Mali. Les données de chacun sont séparées : un établissement ne voit
        jamais les élèves, les notes, les paiements ni le personnel d&apos;un autre. Une même personne peut travailler
        dans plusieurs établissements avec un seul compte : chacun ne voit que la fiche et les droits qui le
        concernent.
      </p>

      <h2>2. Données traitées</h2>
      <table>
        <thead>
          <tr><th>Personnes</th><th>Données</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Élèves (souvent mineurs)</td>
            <td>Nom, prénom, date de naissance, sexe, matricule, classe, notes, bulletins, appréciations, décisions, frais et paiements de scolarité.</td>
          </tr>
          <tr>
            <td>Parents / tuteurs</td>
            <td>Nom, téléphone, adresse e-mail.</td>
          </tr>
          <tr>
            <td>Personnel</td>
            <td>Nom, prénom, téléphone, poste, rôle, e-mail de connexion, mot de passe (stocké chiffré, jamais en clair), rémunération et paiements.</td>
          </tr>
          <tr>
            <td>Directeurs qui inscrivent une école</td>
            <td>Nom, prénom, adresse e-mail, mot de passe (stocké chiffré), nom, adresse et téléphone de l&apos;école.</td>
          </tr>
          <tr>
            <td>Destinataires d&apos;e-mails de GES Mali</td>
            <td>Adresse e-mail, objet et contenu du message (lien de confirmation ou de nouveau mot de passe), dates d&apos;envoi.</td>
          </tr>
          <tr>
            <td>Tous les utilisateurs connectés</td>
            <td>Journal des actions importantes (audit : qui a fait quoi et quand), cookies de session.</td>
          </tr>
        </tbody>
      </table>
      <p>Aucune donnée n&apos;est collectée à des fins publicitaires, ni revendue, ni utilisée pour du profilage.</p>

      <h2>3. Pourquoi ? (finalités et bases légales)</h2>
      <ul>
        <li>Gestion de la scolarité : inscriptions, classes, notes, bulletins, transition annuelle — mission éducative de l&apos;établissement et exécution du contrat d&apos;inscription.</li>
        <li>Gestion financière : frais de scolarité, reçus, rappels d&apos;impayés, paiements du personnel — exécution du contrat et obligations comptables.</li>
        <li>Information des parents via l&apos;espace parent — mission éducative et intérêt de l&apos;élève.</li>
        <li>Sécurité : authentification, traçabilité des actions (audit), prévention des accès frauduleux — intérêt légitime de l&apos;établissement.</li>
        <li>Fonctionnement de la plateforme : inscription d&apos;une école, confirmation d&apos;adresse e-mail, mot de passe oublié — exécution du service demandé.</li>
      </ul>

      <h2>4. Qui peut voir les données ?</h2>
      <ul>
        <li>Le personnel de l&apos;établissement, selon son rôle (un comptable ne voit pas les notes, un enseignant ne voit pas les paiements, etc.).</li>
        <li>Les parents / tuteurs : uniquement les informations de leur enfant, en lecture seule, via leur lien personnel. Seules les notes validées par l&apos;établissement y apparaissent.</li>
        <li>Le sous-traitant et ses hébergeurs, uniquement pour faire fonctionner le service.</li>
      </ul>

      <h2>5. Où sont les données ?</h2>
      <p>
        Les données sont hébergées par {LEGAL.hebergeurBase} ; l&apos;application par{" "}
        {LEGAL.hebergeurApplication} ; les e-mails sont envoyés par {LEGAL.hebergeurEmails}. Les données sont
        donc transférées hors du Mali : ce transfert est
        encadré conformément à la loi n° 2013-015 et aux exigences de l&apos;Autorité de Protection des
        Données à caractère Personnel (APDP).
      </p>

      <h2>6. Durées de conservation</h2>
      <ul>
        <li>Dossier scolaire (identité, notes, bulletins) : pendant la scolarité, puis archivage selon les obligations de l&apos;établissement.</li>
        <li>Données financières (frais, reçus, paiements) : durée imposée par les obligations comptables.</li>
        <li>Comptes du personnel : jusqu&apos;à la fin de la relation de travail, puis désactivation.</li>
        <li>Lien d&apos;accès parent : désactivé dès la radiation ou le transfert de l&apos;élève, ou à la demande du parent.</li>
        <li>E-mails envoyés : supprimés 30 jours après leur envoi. Liens reçus par e-mail : valables 1 heure (mot de passe oublié) ou 48 heures, supprimés une semaine après leur expiration.</li>
        <li>Inscription d&apos;une école non confirmée : rien n&apos;est créé ; la demande disparaît avec son lien.</li>
        <li>Cookies de session : 30 jours au plus (voir la <Link href="/cookies" className="text-[var(--color-brand)] underline">politique cookies</Link>).</li>
      </ul>

      <h2>7. Sécurité</h2>
      <ul>
        <li>Connexions chiffrées (HTTPS) et base de données accessible uniquement par connexion chiffrée vérifiée.</li>
        <li>Mots de passe stockés sous forme chiffrée (bcrypt) ; tentatives de connexion répétées bloquées ; après un changement de mot de passe, les sessions ouvertes ailleurs sont fermées.</li>
        <li>Liens reçus par e-mail à usage unique et à durée limitée ; seule leur empreinte est conservée.</li>
        <li>Droits d&apos;accès par rôle, journal d&apos;audit des actions sensibles.</li>
        <li>Lien parent aléatoire et non devinable, remplaçable à tout moment ; pages parent non indexées par les moteurs de recherche.</li>
      </ul>

      <h2>8. Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;opposition pour motif légitime et de
        suppression de vos données (ou de celles de votre enfant mineur), dans les limites des
        obligations légales de l&apos;établissement. Adressez votre demande au secrétariat de
        l&apos;établissement scolaire, ou à {LEGAL.email}. Une réponse vous sera apportée dans un délai
        raisonnable.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l&apos;Autorité de
        Protection des Données à caractère Personnel (APDP) du Mali.
      </p>
    </PageLegale>
  );
}
