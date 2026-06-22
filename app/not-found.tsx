import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-medium text-slate-500">Erreur 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page introuvable</h1>
        <p className="mt-2 text-sm text-slate-500">
          La page demandée est introuvable ou n’existe pas.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}
