import Link from "next/link";
import { AnneauStatuts, BarresGroupees, CarteGraphique, COULEURS, CourbeAire, fcfa } from "@/components/graphiques/Graphiques";
import { fmtPeriode } from "@/lib/frais/periode";
import type { MoisFinances } from "@/lib/tableau-de-bord/finances";

export type SituationEleves = { aJour: number; enRetard: number; sansFrais: number };

export function Finances({
  mois,
  options,
  flux,
  salairesPrevus,
  situation,
}: {
  mois: string;
  options: { valeur: string; libelle: string }[];
  flux: MoisFinances[];
  salairesPrevus: number;
  situation: SituationEleves;
}) {
  const courant = flux[flux.length - 1];
  const libelleMois = fmtPeriode(mois);
  const taux = courant.attendu > 0 ? Math.round((courant.encaisse / courant.attendu) * 100) : null;

  return (
    <div className="space-y-4">
      {/* Filtre : une seule ligne, au-dessus de tous les graphiques qu'il pilote */}
      <form className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Finances</h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {taux !== null
              ? `${libelleMois} : ${taux} % des échéances encaissées`
              : `${libelleMois} : aucune échéance attendue`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="mois" className="text-xs text-[var(--color-ink-muted)]">
            Mois
          </label>
          <select
            id="mois"
            name="mois"
            defaultValue={mois}
            className="h-9 rounded-lg border border-[var(--color-border-strong)] bg-white px-2.5 text-sm"
          >
            {options.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-lg bg-[var(--color-brand)] px-3 text-sm text-white hover:bg-[var(--color-brand-dark)]">
            Afficher
          </button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <CarteGraphique
          titre="Attendu et encaissé"
          sousTitre={"Frais de scolarité, 6 mois jusqu'à " + libelleMois.toLowerCase()}
          action={
            <Link href="/frais/impaies" className="whitespace-nowrap text-xs text-[var(--color-brand)] hover:underline">
              Voir les impayés
            </Link>
          }
        >
          <BarresGroupees
            titre="Frais attendus et encaissés par mois"
            series={[
              { nom: "Attendu", couleur: COULEURS.prevu },
              { nom: "Encaissé", couleur: COULEURS.reel },
            ]}
            categories={flux.map((m) => ({ libelle: m.libelle, court: m.libelle.split(" ")[0], valeurs: [m.attendu, m.encaisse] }))}
          />
        </CarteGraphique>

        <CarteGraphique titre={"Prévu et réel, " + libelleMois.toLowerCase()} sousTitre="Entrées et sorties du mois choisi">
          <BarresGroupees
            titre={"Prévu et réel, " + libelleMois}
            series={[
              { nom: "Prévu", couleur: COULEURS.prevu },
              { nom: "Réel", couleur: COULEURS.reel },
            ]}
            categories={[
              { libelle: "Frais de scolarité", valeurs: [courant.attendu, courant.encaisse] },
              { libelle: "Salaires", valeurs: [salairesPrevus, courant.salaires] },
            ]}
          />
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3 text-xs">
            <div>
              <dt className="text-[var(--color-ink-muted)]">Frais de scolarité</dt>
              <dd className="mt-0.5">
                <span className="font-semibold tnum">{fcfa(courant.encaisse)}</span>
                <span className="text-[var(--color-ink-muted)]"> encaissés sur {fcfa(courant.attendu)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-muted)]">Salaires</dt>
              <dd className="mt-0.5">
                <span className="font-semibold tnum">{fcfa(courant.salaires)}</span>
                <span className="text-[var(--color-ink-muted)]"> versés sur {fcfa(salairesPrevus)}</span>
              </dd>
            </div>
          </dl>
        </CarteGraphique>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <CarteGraphique
          titre="Solde mensuel"
          sousTitre="Frais encaissés moins salaires versés"
          action={
            <p className="text-right text-xs text-[var(--color-ink-muted)]">
              {courant.libelle}
              <span className="block text-sm font-semibold text-[var(--color-ink)]">
                {fcfa(courant.encaisse - courant.salaires)}
              </span>
            </p>
          }
        >
          <CourbeAire
            titre="Solde mensuel"
            serie={{ nom: "Solde", couleur: COULEURS.prevu }}
            points={flux.map((m) => ({ libelle: m.libelle, court: m.libelle.split(" ")[0], valeur: m.encaisse - m.salaires }))}
          />
        </CarteGraphique>

        <CarteGraphique
          titre="Situation des élèves"
          sousTitre="Paiements de l'année en cours"
          action={
            <Link href="/frais" className="whitespace-nowrap text-xs text-[var(--color-brand)] hover:underline">
              Détail
            </Link>
          }
        >
          <AnneauStatuts
            unite="élèves"
            segments={[
              { libelle: "À jour", valeur: situation.aJour, statut: "bon" },
              { libelle: "En retard", valeur: situation.enRetard, statut: "critique" },
              { libelle: "Sans frais configurés", valeur: situation.sansFrais, statut: "neutre" },
            ]}
          />
        </CarteGraphique>
      </div>
    </div>
  );
}
