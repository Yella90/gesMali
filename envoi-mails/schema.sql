-- File d'attente des e-mails, commune a tous vos systemes (base PostgreSQL dediee).
-- Chaque systeme y depose ses messages ; la tache planifiee (envoyer.py) les envoie.
-- A executer une fois dans la base dediee : psql "$MAIL_DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS mail_sortant (
  id                BIGSERIAL PRIMARY KEY,
  systeme           TEXT        NOT NULL,              -- systeme qui envoie, ex. 'GES Mali' (nom de l'expediteur affiche)
  destinataire      TEXT        NOT NULL,              -- adresse e-mail du destinataire
  objet             TEXT        NOT NULL,              -- objet du message
  titre             TEXT        NOT NULL,              -- titre affiche en tete du message
  message           TEXT        NOT NULL,              -- corps en texte ; retours a la ligne et liens conserves
  message_html      TEXT,                              -- facultatif : corps HTML complet, sinon construit a partir du titre et du message

  -- Suivi par la tache d'envoi
  statut            TEXT        NOT NULL DEFAULT 'EN_ATTENTE'
                    CHECK (statut IN ('EN_ATTENTE', 'EN_COURS', 'ENVOYE', 'ECHEC')),
  tentatives        INTEGER     NOT NULL DEFAULT 0,
  derniere_erreur   TEXT,
  cree_le           TIMESTAMPTZ NOT NULL DEFAULT now(),
  prochain_essai_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  envoye_le         TIMESTAMPTZ
);

-- Messages a envoyer, du plus ancien au plus recent
CREATE INDEX IF NOT EXISTS mail_sortant_a_envoyer
  ON mail_sortant (prochain_essai_le, id) WHERE statut = 'EN_ATTENTE';

-- Suivi par systeme
CREATE INDEX IF NOT EXISTS mail_sortant_systeme ON mail_sortant (systeme, cree_le);
