#!/usr/bin/env bash
# Sauvegarde quotidienne de la base de production de GES Mali (tache planifiee AlwaysData).
# pg_dump au format « custom » (compresse), verifie par pg_restore --list, puis menage des
# sauvegardes de plus de JOURS_CONSERVATION jours. En cas d'echec, le script sort avec un
# code non nul : AlwaysData envoie alors un rapport d'erreur aux adresses de la tache.
#
# Variables (fichier SAUVEGARDE_CONF, defaut $HOME/sauvegardes/ges-mali.conf, ou environnement) :
#   SAUVEGARDE_DATABASE_URL  URL PostgreSQL de la base ; Neon : URL directe (hote sans -pooler)  (obligatoire)
#   DOSSIER_SAUVEGARDES      defaut : $HOME/sauvegardes/ges-mali
#   JOURS_CONSERVATION       defaut : 7
#   PG_BIN                   dossier de pg_dump et pg_restore, si ceux du PATH sont plus anciens
#                            que le serveur (pg_dump doit etre de la meme version ou plus recent)
set -euo pipefail

# Configuration dans un fichier lisible par le seul compte : l'URL (avec son mot de passe)
# n'apparait ni dans le formulaire de la tache planifiee ni dans ses journaux
conf="${SAUVEGARDE_CONF:-$HOME/sauvegardes/ges-mali.conf}"
if [ -f "$conf" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$conf"
  set +a
fi

: "${SAUVEGARDE_DATABASE_URL:?Variable manquante : SAUVEGARDE_DATABASE_URL}"
dossier="${DOSSIER_SAUVEGARDES:-$HOME/sauvegardes/ges-mali}"
jours="${JOURS_CONSERVATION:-7}"
pg_dump="${PG_BIN:+$PG_BIN/}pg_dump"
pg_restore="${PG_BIN:+$PG_BIN/}pg_restore"

# Fichiers lisibles par le seul compte : ils contiennent toutes les donnees des ecoles
umask 077
mkdir -p "$dossier"
fichier="$dossier/ges-mali-$(date +%Y-%m-%d_%H%M).dump"
partiel="$fichier.partiel"
trap 'rm -f "$partiel"' EXIT

"$pg_dump" --format=custom --compress=9 --no-owner --no-privileges --dbname="$SAUVEGARDE_DATABASE_URL" --file="$partiel"
# Fichier complet et lisible avant de le garder
"$pg_restore" --list "$partiel" > /dev/null
mv "$partiel" "$fichier"

find "$dossier" -maxdepth 1 -name 'ges-mali-*.dump' -mtime +"$jours" -delete

nb=$(find "$dossier" -maxdepth 1 -name 'ges-mali-*.dump' | wc -l)
echo "Sauvegarde OK : $(basename "$fichier") ($(du -h "$fichier" | cut -f1)), $nb sauvegarde(s) conservee(s)"
