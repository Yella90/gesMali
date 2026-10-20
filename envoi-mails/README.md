# Envoi des e-mails : une file d'attente commune à vos systèmes

Vos systèmes (GES Mali et les autres) n'envoient pas eux-mêmes leurs e-mails : ils déposent
chaque message dans la table `mail_sortant` d'une base PostgreSQL dédiée. Une tâche planifiée
sur AlwaysData lance `envoyer.py`, qui envoie les messages en attente par SMTP.

## 1. Créer la base et la table

Sur AlwaysData : **Bases de données → PostgreSQL → Ajouter une base** (par exemple `moncompte_mails`),
avec un utilisateur dédié. Puis, depuis un terminal (SSH AlwaysData ou votre poste) :

```bash
psql "postgresql://utilisateur:motdepasse@postgresql-moncompte.alwaysdata.net:5432/moncompte_mails" -f schema.sql
```

## 2. Déposer un message depuis un système

Une simple insertion SQL, depuis n'importe quel langage :

```sql
INSERT INTO mail_sortant (systeme, destinataire, objet, titre, message)
VALUES ('GES Mali', 'parent@exemple.ml', 'Objet du message', 'Titre affiché', 'Corps du message, liens compris.');
```

| Colonne        | Contenu                                                                    |
|----------------|----------------------------------------------------------------------------|
| `systeme`      | Nom du système qui envoie ; c'est aussi le nom d'expéditeur affiché        |
| `destinataire` | Adresse e-mail du destinataire                                             |
| `objet`        | Objet du message                                                           |
| `titre`        | Titre affiché en tête du message                                           |
| `message`      | Corps en texte ; retours à la ligne conservés, liens rendus cliquables     |
| `message_html` | Facultatif : HTML complet, à la place de la mise en page automatique       |

Les autres colonnes (`statut`, `tentatives`, `derniere_erreur`, `envoye_le`...) sont tenues à jour par `envoyer.py`.

**GES Mali** dépose ses messages dès que la variable `MAIL_DATABASE_URL` (Vercel) pointe sur cette
base : inscription d'une école, confirmation d'adresse, mot de passe oublié. Sans cette variable,
l'inscription en ligne et « mot de passe oublié » restent fermés.

## 3. Installer le script d'envoi sur AlwaysData

1. Copier `envoyer.py` sur votre compte, par exemple dans `~/envoi-mails/`.
2. En SSH : `pip install --user "psycopg[binary]"`.
3. **Avancé → Tâches planifiées → Ajouter** :
   - type : *Commande* ;
   - commande : `python3 ~/envoi-mails/envoyer.py` ;
   - fréquence : toutes les 5 minutes (`*/5 * * * *`) ;
   - variables d'environnement (ou un fichier `~/envoi-mails/.env` chargé par la commande) :

| Variable             | Exemple                                         |
|----------------------|-------------------------------------------------|
| `MAIL_DATABASE_URL`  | `postgresql://utilisateur:motdepasse@postgresql-moncompte.alwaysdata.net:5432/moncompte_mails` |
| `SMTP_HOTE`          | `smtp-moncompte.alwaysdata.net`                 |
| `SMTP_PORT`          | `465`                                           |
| `SMTP_UTILISATEUR`   | `noreply@votre-domaine.ml` (boîte créée dans **E-mails → Adresses**) |
| `SMTP_MOT_DE_PASSE`  | mot de passe de cette boîte                     |
| `EXPEDITEUR_ADRESSE` | `noreply@votre-domaine.ml` (défaut : `SMTP_UTILISATEUR`) |
| `REPONDRE_A`         | facultatif                                      |
| `LOT`                | messages par passage, défaut `50`               |
| `MAX_TENTATIVES`     | défaut `5`                                      |
| `CONSERVATION_JOURS` | messages envoyés ou abandonnés supprimés après ce délai, défaut `30` (`0` : jamais) |

Pour lancer la commande avec un fichier de variables :
`set -a && . ~/envoi-mails/.env && set +a && python3 ~/envoi-mails/envoyer.py`

Vérifier sans rien envoyer : `python3 envoyer.py --essai` (liste les messages en attente).

## 4. Fonctionnement

- Chaque passage réserve au plus `LOT` messages en attente ; deux passages simultanés ne prennent jamais
  le même message.
- Échec (serveur injoignable, erreur temporaire) : nouvel essai après 5 min, puis 20, 45, 80... ;
  après `MAX_TENTATIVES`, le message passe en `ECHEC` avec la dernière erreur. Une adresse refusée
  par le serveur passe directement en `ECHEC`.
- Un message resté `EN_COURS` plus de 30 minutes (script interrompu) est remis en attente.
- Les messages `ENVOYE` ou `ECHEC` sont supprimés après `CONSERVATION_JOURS` jours (ils contiennent des
  adresses et des liens personnels : pas de conservation sans limite).
- Suivi : `SELECT systeme, statut, count(*) FROM mail_sortant GROUP BY 1, 2;`
