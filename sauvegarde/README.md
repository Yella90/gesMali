# Sauvegarde quotidienne de la base

`sauvegarder.sh` copie chaque nuit la base de production (Neon) sur le compte AlwaysData, au
format `pg_dump` « custom » (compressé), vérifie que le fichier se relit, puis supprime les
sauvegardes de plus de 30 jours. La copie est chez un autre hébergeur que la base : une panne
ou une erreur chez Neon ne l'emporte pas.

## Installation (déjà faite sur le compte `unitech`)

1. Script : `~/sauvegardes/sauvegarder.sh` (droits `700`).
2. Configuration : `~/sauvegardes/ges-mali.conf` (droits `600`, lisible par le seul compte) :

   ```
   SAUVEGARDE_DATABASE_URL=postgresql://utilisateur:motdepasse@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   JOURS_CONSERVATION=30
   ```

   URL **directe** de Neon (hôte sans `-pooler`). Le mot de passe n'apparaît ainsi ni dans le
   formulaire de la tâche planifiée ni dans ses journaux.
3. Tâche planifiée AlwaysData (*Avancé → Tâches planifiées*) : commande
   `~/sauvegardes/sauvegarder.sh`, tous les jours à 03:00, adresse e-mail pour les rapports
   d'erreur.

`pg_dump` doit être de la même version majeure que le serveur, ou plus récent (Neon : 18 ;
AlwaysData fournit `pg_dump` 18). Sinon, indiquer le dossier d'une version récente dans `PG_BIN`.

## Vérifier

- Journal de la tâche : « Sauvegarde OK : ges-mali-AAAA-MM-JJ_HHMM.dump (taille), N sauvegarde(s) conservée(s) ».
- Fichiers : `ls -l ~/sauvegardes/ges-mali/`
- Contenu d'une sauvegarde : `pg_restore --list ~/sauvegardes/ges-mali/<fichier>.dump`

## Restaurer

Toujours d'abord dans une base **vide** (nouvelle branche Neon, par exemple), jamais directement
par-dessus la production :

```bash
pg_restore --no-owner --no-privileges --dbname="postgresql://…/base_vide?sslmode=require" ~/sauvegardes/ges-mali/<fichier>.dump
```

Une fois les données vérifiées, faire pointer l'application (`DATABASE_URL` sur Vercel) vers
cette base, ou en recopier les tables utiles.

Récupérer une sauvegarde sur son ordinateur : SFTP sur `ssh-unitech.alwaysdata.net`, dossier
`sauvegardes/ges-mali/` (les fichiers contiennent toutes les données des écoles : à garder en
lieu sûr).
