// Limite les tentatives de connexion echouees par e-mail (memoire du processus).
// Suffisant pour un serveur unique ; derriere plusieurs instances, chaque
// instance a son propre compteur.

const MAX_ECHECS = 5;
const FENETRE_MS = 15 * 60 * 1000;

const echecs = new Map<string, { nb: number; depuis: number }>();

function cle(email: string) {
  return email.trim().toLowerCase();
}

export function connexionBloquee(email: string, maintenant = Date.now()): boolean {
  const e = echecs.get(cle(email));
  if (!e) return false;
  if (maintenant - e.depuis > FENETRE_MS) {
    echecs.delete(cle(email));
    return false;
  }
  return e.nb >= MAX_ECHECS;
}

export function noterEchec(email: string, maintenant = Date.now()) {
  const k = cle(email);
  const e = echecs.get(k);
  if (!e || maintenant - e.depuis > FENETRE_MS) echecs.set(k, { nb: 1, depuis: maintenant });
  else e.nb++;
}

export function effacerEchecs(email: string) {
  echecs.delete(cle(email));
}
