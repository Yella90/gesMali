#!/usr/bin/env python3
"""Envoi des e-mails en attente de la table mail_sortant (tache planifiee AlwaysData).

Chaque execution reserve un lot de messages en attente (sans conflit si deux executions se
chevauchent), les envoie par SMTP, puis les marque ENVOYE. En cas d'echec, le message est
retente plus tard (5 min, 20 min, 45 min...) jusqu'a MAX_TENTATIVES, puis marque ECHEC.

Configuration (variables d'environnement) :
  MAIL_DATABASE_URL   postgresql://utilisateur:motdepasse@hote:5432/base   (obligatoire)
  SMTP_HOTE           ex. smtp-moncompte.alwaysdata.net                    (obligatoire)
  SMTP_PORT           465 (SSL), 587 (STARTTLS) ou autre (sans chiffrement)  defaut 465
  SMTP_UTILISATEUR    identifiant de la boite d'envoi (vide : pas d'authentification)
  SMTP_MOT_DE_PASSE
  EXPEDITEUR_ADRESSE  adresse d'expedition (defaut : SMTP_UTILISATEUR)
  REPONDRE_A          adresse de reponse (facultatif)
  LOT                 messages par execution (defaut 50)
  MAX_TENTATIVES      essais avant abandon (defaut 5)
  CONSERVATION_JOURS  messages envoyes ou abandonnes supprimes apres ce nombre de jours
                      (defaut 30 ; 0 : jamais supprimes)

Usage :
  python3 envoyer.py           envoie les messages en attente
  python3 envoyer.py --essai   affiche les messages en attente, sans rien envoyer ni modifier

Dependance : pip install --user "psycopg[binary]"
"""

import html
import os
import re
import smtplib
import ssl
import sys
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

import psycopg

RESERVER = """
UPDATE mail_sortant
SET statut = 'EN_COURS', tentatives = tentatives + 1, prochain_essai_le = now()
WHERE id IN (
  SELECT id FROM mail_sortant
  WHERE statut = 'EN_ATTENTE' AND prochain_essai_le <= now()
  ORDER BY prochain_essai_le, id
  LIMIT %s
  FOR UPDATE SKIP LOCKED
)
RETURNING id, systeme, destinataire, objet, titre, message, message_html, tentatives
"""

# Messages restes EN_COURS apres un arret brutal du script : remis en attente
LIBERER_BLOQUES = """
UPDATE mail_sortant SET statut = 'EN_ATTENTE'
WHERE statut = 'EN_COURS' AND prochain_essai_le < now() - interval '30 minutes'
"""

# Menage : messages traites (envoyes ou abandonnes) depuis plus de CONSERVATION_JOURS jours
SUPPRIMER_ANCIENS = """
DELETE FROM mail_sortant
WHERE statut IN ('ENVOYE', 'ECHEC') AND cree_le < now() - make_interval(days => %s)
"""

EN_ATTENTE_ESSAI = """
SELECT id, systeme, destinataire, objet, tentatives, cree_le FROM mail_sortant
WHERE statut = 'EN_ATTENTE' AND prochain_essai_le <= now()
ORDER BY prochain_essai_le, id LIMIT %s
"""


def config(nom, defaut=None, obligatoire=False):
    valeur = os.environ.get(nom, defaut)
    if obligatoire and not valeur:
        sys.exit("Variable manquante : " + nom)
    return valeur


def corps_html(titre, message, systeme):
    """Message en texte -> HTML simple : titre, paragraphes, liens cliquables."""
    texte = html.escape(message)
    texte = re.sub(r"(https?://[^\s<]+)", r'<a href="\1" style="color:#1e3a5f">\1</a>', texte)
    texte = texte.replace("\n", "<br>\n")
    return (
        '<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>'
        '<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">'
        '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">'
        f'<h1 style="margin:0 0 16px;font-size:20px;color:#1e3a5f">{html.escape(titre)}</h1>'
        f'<div style="font-size:15px;line-height:1.6">{texte}</div>'
        f'<p style="margin:24px 0 0;font-size:12px;color:#64748b">Message envoyé par {html.escape(systeme)}.</p>'
        "</div></body></html>"
    )


def construire(m, expediteur, repondre_a):
    msg = EmailMessage()
    msg["From"] = formataddr((m["systeme"], expediteur))
    msg["To"] = m["destinataire"]
    msg["Subject"] = m["objet"]
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=expediteur.split("@")[-1])
    if repondre_a:
        msg["Reply-To"] = repondre_a
    msg.set_content(m["titre"] + "\n\n" + m["message"] + "\n\n-- \nMessage envoyé par " + m["systeme"] + ".")
    msg.add_alternative(m["message_html"] or corps_html(m["titre"], m["message"], m["systeme"]), subtype="html")
    return msg


def connecter_smtp(hote, port, utilisateur, mot_de_passe):
    contexte = ssl.create_default_context()
    if port == 465:
        smtp = smtplib.SMTP_SSL(hote, port, context=contexte, timeout=30)
    else:
        smtp = smtplib.SMTP(hote, port, timeout=30)
        smtp.ehlo()
        if smtp.has_extn("starttls"):
            smtp.starttls(context=contexte)
            smtp.ehlo()
    if utilisateur:
        smtp.login(utilisateur, mot_de_passe or "")
    return smtp


def marquer_envoye(conn, id_):
    conn.execute("UPDATE mail_sortant SET statut = 'ENVOYE', envoye_le = now(), derniere_erreur = NULL WHERE id = %s", (id_,))


def marquer_echec(conn, id_, tentatives, erreur, max_tentatives, definitif=False):
    erreur = str(erreur)[:1000]
    if definitif or tentatives >= max_tentatives:
        conn.execute("UPDATE mail_sortant SET statut = 'ECHEC', derniere_erreur = %s WHERE id = %s", (erreur, id_))
    else:
        # Nouvel essai : 5 min, 20 min, 45 min, 80 min...
        conn.execute(
            "UPDATE mail_sortant SET statut = 'EN_ATTENTE', derniere_erreur = %s, "
            "prochain_essai_le = now() + make_interval(mins => %s) WHERE id = %s",
            (erreur, 5 * tentatives * tentatives, id_),
        )


def main():
    essai = "--essai" in sys.argv[1:]
    url = config("MAIL_DATABASE_URL", obligatoire=True)
    lot = int(config("LOT", "50"))
    max_tentatives = int(config("MAX_TENTATIVES", "5"))
    conservation = int(config("CONSERVATION_JOURS", "30"))

    with psycopg.connect(url, autocommit=True) as conn:
        if essai:
            lignes = conn.execute(EN_ATTENTE_ESSAI, (lot,)).fetchall()
            print(f"{len(lignes)} message(s) en attente :")
            for id_, systeme, destinataire, objet, tentatives, cree_le in lignes:
                print(f"  #{id_} [{systeme}] {destinataire} : {objet} (essais : {tentatives}, depose le {cree_le:%d/%m/%Y %H:%M})")
            return 0

        hote = config("SMTP_HOTE", obligatoire=True)
        port = int(config("SMTP_PORT", "465"))
        utilisateur = config("SMTP_UTILISATEUR", "")
        mot_de_passe = config("SMTP_MOT_DE_PASSE", "")
        expediteur = config("EXPEDITEUR_ADRESSE", utilisateur)
        if not expediteur:
            sys.exit("Variable manquante : EXPEDITEUR_ADRESSE (ou SMTP_UTILISATEUR)")
        repondre_a = config("REPONDRE_A", "")

        conn.execute(LIBERER_BLOQUES)
        if conservation > 0:
            conn.execute(SUPPRIMER_ANCIENS, (conservation,))
        colonnes = ["id", "systeme", "destinataire", "objet", "titre", "message", "message_html", "tentatives"]
        messages = [dict(zip(colonnes, ligne)) for ligne in conn.execute(RESERVER, (lot,)).fetchall()]
        if not messages:
            print("Aucun message en attente.")
            return 0

        try:
            smtp = connecter_smtp(hote, port, utilisateur, mot_de_passe)
        except Exception as e:  # serveur injoignable ou identifiants refuses : tout le lot sera retente
            for m in messages:
                marquer_echec(conn, m["id"], m["tentatives"], "Connexion SMTP : " + str(e), max_tentatives)
            print("Connexion SMTP impossible :", e, file=sys.stderr)
            return 1

        envoyes = 0
        with smtp:
            for m in messages:
                try:
                    smtp.send_message(construire(m, expediteur, repondre_a))
                    marquer_envoye(conn, m["id"])
                    envoyes += 1
                except smtplib.SMTPRecipientsRefused as e:  # adresse refusee : inutile de reessayer
                    marquer_echec(conn, m["id"], m["tentatives"], e, max_tentatives, definitif=True)
                except Exception as e:
                    marquer_echec(conn, m["id"], m["tentatives"], e, max_tentatives)

        print(f"{envoyes} envoye(s), {len(messages) - envoyes} en echec ou reporte(s), sur {len(messages)}.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
