export default function LienInvalide() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-surface)]">
      <div className="max-w-sm w-full bg-white rounded-xl border border-[var(--color-border)] p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center font-bold">
          ?
        </div>
        <h1 className="text-lg font-semibold mt-4">Lien invalide ou expiré</h1>
        <p className="text-sm text-[var(--color-ink-muted)] mt-2">
          Ce lien d&apos;accès parent n&apos;est plus valable. L&apos;établissement a peut-être généré un nouveau lien.
          Demandez une nouvelle fiche d&apos;inscription au secrétariat.
        </p>
      </div>
    </div>
  );
}
