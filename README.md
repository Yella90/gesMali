# GES Mali

Gestion d'établissement scolaire : élèves, classes, notes, bulletins, frais de scolarité,
personnel, transition annuelle, et **espace parent** accessible par QR code.

Stack : Next.js 16 (App Router, webpack), React 19, Prisma 7 + PostgreSQL (Supabase ou Neon),
Auth.js v5 (identifiants), `@react-pdf/renderer` pour les PDF.

## Démarrer en local

```bash
cp .env.example .env      # puis remplir les valeurs
npm install
npm run db:deploy         # applique les migrations
npm run dev               # http://localhost:3000
```

Vérifications avant de livrer (les mêmes tournent dans GitHub Actions à chaque envoi, voir
`.github/workflows/ci.yml`) :

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

`npm test` utilise une base PostgreSQL **locale** uniquement (`npx prisma dev -n ges-mali-test -d`
une fois), jamais celle du `.env`.

## Mise en production

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | PostgreSQL. Supabase : URL « Transaction pooler » (port 6543). Neon : URL « pooled » avec `?sslmode=require`. Le certificat TLS est vérifié. |
| `AUTH_SECRET` | Secret de session, aléatoire (`npx auth secret`). Un secret différent par environnement. |
| `AUTH_URL` | URL publique de l'application, en `https://`. |
| `AUTH_TRUST_HOST` | `true` derrière un reverse proxy (Nginx, Docker…). Inutile sur Vercel. |
| `DIRECT_URL` | Facultatif. URL des migrations : Supabase « Session pooler » (port 5432), Neon URL sans `-pooler`. |
| `DATABASE_SCHEMA` | Facultatif, défaut `public`. Schéma PostgreSQL de l'application et des migrations. |
| `APP_URL` | URL utilisée dans les liens et QR codes parents et dans les liens des e-mails (par défaut `AUTH_URL`). Elle doit être joignable depuis le téléphone des parents. |
| `ADMINS_PLATEFORME` | E-mails des administrateurs de la plateforme (`/plateforme`), séparés par des virgules. |
| `MAIL_DATABASE_URL` | Base PostgreSQL de la file d'envoi des e-mails (`envoi-mails/`). Sans elle, l'inscription en ligne et « mot de passe oublié » restent fermés. |

### Déploiement

1. Configurer les variables ci-dessus chez l'hébergeur.
2. Appliquer les migrations **avant** de démarrer la nouvelle version : `npm run db:deploy`.
3. Construire et démarrer : `npm run build` puis `npm run start`.

Sur **Vercel** : importer le dépôt et renseigner les variables (`AUTH_TRUST_HOST` inutile).
Les **migrations sont appliquées automatiquement** au build des déploiements de production
(script `vercel-build` → `scripts/migrer-au-build.mjs`). Elles sont ignorées pour les
prévisualisations, qui partagent la même base. Si une migration échoue, le build échoue et la
version précédente reste en ligne. Ne pas définir de « Build Command » personnalisée dans les
réglages Vercel, sinon `vercel-build` n'est pas utilisé.
Recommandé : définir aussi `DIRECT_URL` pour les migrations (voir le tableau).
`vercel.json` fixe la région des fonctions à `fra1` (Francfort), à côté de la base.

> Pages légales : `/conditions-utilisation`, `/confidentialite`, `/cookies`. Compléter le nom et
> l'adresse de l'éditeur dans `lib/legal.ts`, et faire relire les textes par un juriste.

> Performance : héberger l'application dans la **même région que la base**
> (`eu-central-1`, Francfort). Le volume de données entre l'application et la base
> est le facteur dominant ; depuis une connexion lointaine, les pages sont nettement plus lentes.

### Checklist sécurité

- [ ] Changer le mot de passe du compte directeur créé par le seed (tiré au hasard, ou `SEED_MOT_DE_PASSE`), et de tout compte créé par une version antérieure du seed.
- [ ] `AUTH_SECRET` propre à la production, jamais commité.
- [ ] Servir uniquement en HTTPS (l'en-tête HSTS est envoyé).
- [ ] Les scripts de maintenance locaux (`check-*.ts`, `reset-password.ts`…) ne sont pas versionnés ; ne pas les déployer.

Déjà en place : en-têtes de sécurité (`next.config.ts`), limitation des tentatives de connexion
(5 échecs / 15 min par e-mail, 50 par adresse IP, en base), données de chaque école isolées
(`lib/data/ecole.ts`), contrôle des permissions par rôle sur chaque page, action serveur et route
API, liens reçus par e-mail à usage unique, sessions fermées après un changement de mot de passe,
rattachement d'un compte à une autre école seulement si son adresse est confirmée.

## Instances : démonstration et clients

- **Démonstration** : projet Supabase partagé « Unitech ERP Mali », schéma dédié `ges_mali`
  (`DATABASE_SCHEMA=ges_mali`). Le schéma n'est pas exposé par l'API Supabase (aucun droit pour
  `anon` / `authenticated`, RLS activé) ; seule l'application y accède, avec le rôle `postgres`.
- **Client** : son propre projet Supabase et son propre projet Vercel, schéma `public` par défaut.
  Les migrations créent les tables au premier déploiement de production.
- Déplacer les données d'une instance à une autre (base cible migrée et vide) :
  `SOURCE_URL=… SOURCE_SCHEMA=public CIBLE_URL=… CIBLE_SCHEMA=ges_mali node scripts/copier-donnees.mjs`
  (transactionnel, nombres de lignes vérifiés).

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
