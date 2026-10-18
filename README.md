# GES Mali

Gestion d'établissement scolaire : élèves, classes, notes, bulletins, frais de scolarité,
personnel, transition annuelle, et **espace parent** accessible par QR code.

Stack : Next.js 16 (App Router, webpack), React 19, Prisma 7 + PostgreSQL (Neon),
Auth.js v5 (identifiants), `@react-pdf/renderer` pour les PDF.

## Démarrer en local

```bash
cp .env.example .env      # puis remplir les valeurs
npm install
npm run db:deploy         # applique les migrations
npm run dev               # http://localhost:3000
```

Vérifications avant de livrer :

```bash
npm run typecheck && npm run lint && npm run build
```

## Mise en production

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | PostgreSQL. Avec Neon, l'URL « pooled » avec `?sslmode=require`. Le certificat TLS est vérifié. |
| `AUTH_SECRET` | Secret de session, aléatoire (`npx auth secret`). Un secret différent par environnement. |
| `AUTH_URL` | URL publique de l'application, en `https://`. |
| `AUTH_TRUST_HOST` | `true` derrière un reverse proxy (Nginx, Docker…). Inutile sur Vercel. |
| `APP_URL` | URL utilisée dans les liens et QR codes parents (par défaut `AUTH_URL`). Elle doit être joignable depuis le téléphone des parents. |

### Déploiement

1. Configurer les variables ci-dessus chez l'hébergeur.
2. Appliquer les migrations **avant** de démarrer la nouvelle version : `npm run db:deploy`.
3. Construire et démarrer : `npm run build` puis `npm run start`.

Sur **Vercel** : importer le dépôt, renseigner les variables (`AUTH_TRUST_HOST` inutile),
et lancer les migrations depuis un poste (`npm run db:deploy`) avant chaque déploiement qui en contient.
`vercel.json` fixe la région des fonctions à `fra1` (Francfort), à côté de la base Neon.

> Pages légales : `/conditions-utilisation`, `/confidentialite`, `/cookies`. Compléter le nom et
> l'adresse de l'éditeur dans `lib/legal.ts`, et faire relire les textes par un juriste.

> Performance : héberger l'application dans la **même région que la base**
> (Neon `eu-central-1`, Francfort). Le volume de données entre l'application et la base
> est le facteur dominant ; depuis une connexion lointaine, les pages sont nettement plus lentes.

### Checklist sécurité

- [ ] Changer le mot de passe du compte directeur créé par le seed (`prisma/seed.ts` utilise un mot de passe par défaut).
- [ ] `AUTH_SECRET` propre à la production, jamais commité.
- [ ] Servir uniquement en HTTPS (l'en-tête HSTS est envoyé).
- [ ] Les scripts de maintenance locaux (`check-*.ts`, `reset-password.ts`…) ne sont pas versionnés ; ne pas les déployer.

Déjà en place : en-têtes de sécurité (`next.config.ts`), limitation des tentatives de connexion
(5 échecs / 15 min par e-mail, mémoire du processus), contrôle des permissions par rôle sur
chaque page, action serveur et route API.

## Espace parent

- À l'inscription, chaque élève reçoit un **code secret** (144 bits). La **fiche d'inscription PDF**
  (bouton sur la fiche élève) contient un QR code vers `/parent/<code>`.
- Le parent voit, en lecture seule et sans compte : le profil, les bulletins (PDF), les notes
  **validées ou verrouillées** de l'année en cours et la situation des frais.
- Lien perdu ou partagé : bouton **« Nouveau lien »** sur la fiche élève. L'ancien lien cesse de
  fonctionner (action tracée dans l'audit). Il faut alors réimprimer la fiche.
- L'accès est fermé pour un élève radié ou transféré.
- Les élèves inscrits avant cette fonctionnalité reçoivent leur code à la première ouverture de leur fiche.

## Inscription sans frais d'inscription

Dans le formulaire d'inscription, la case **« Inscrire sans frais d'inscription »** (visible si la
classe a des frais d'inscription) crée l'élève sans échéance « Inscription » : seule la scolarité
mensuelle est due. L'exonération est tracée dans l'audit et affichée « Exonéré » sur la fiche.
