// Resultat d'une action serveur. En production, Next remplace le message d'une
// erreur levee dans une action par un texte generique : les actions renvoient
// donc leur erreur au lieu de la lever, et le client la releve avec `executer`.

export type Resultat<T = void> = { ok: true; data: T } | { ok: false; erreur: string };

// Cote client : renvoie la donnee, ou leve une erreur portant le message de l'action
export async function executer<T>(appel: Promise<Resultat<T>>): Promise<T> {
  const r = await appel;
  if (!r.ok) throw new Error(r.erreur);
  return r.data;
}

// Cote client : meme signature que l'action, mais renvoie la donnee ou leve l'erreur
// (les composants gardent leur try/catch habituel)
export function relever<A extends unknown[], T>(action: (...a: A) => Promise<Resultat<T>>) {
  return (...a: A): Promise<T> => executer(action(...a));
}
