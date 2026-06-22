'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/components/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden bg-[#0B1F33] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-xl bg-white/10 px-3 py-2">
                <span className="text-sm font-semibold tracking-[0.24em]">TEKFUTURA</span>
              </div>
              <h1 className="mt-8 text-4xl font-semibold">Gestion des congés</h1>
              <p className="mt-3 max-w-sm text-sm text-slate-300">Suivez les demandes, les absences et les plannings en toute simplicité.</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-sm text-slate-200">
              Accès réservé aux collaborateurs TekFutura.
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Connexion</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Bienvenue</h2>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="nom@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
