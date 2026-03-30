"use client";

import { useState } from "react";

const ACCESS_PASSWORD = "FriasNeto@MRV2026";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (password === ACCESS_PASSWORD) {
        onSuccess();
      } else {
        setError(true);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-header">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center justify-center gap-4 mb-8">
          <img
            src="https://www.friasneto.com.br/imo_arq/empresa_logo/logo-site-imobiliaria.png"
            alt="Frias Neto"
            className="h-10 object-contain"
          />
          <div className="w-px h-10 bg-gray-300" />
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/a/ac/MRV_Marca_2019.jpg"
            alt="MRV"
            className="h-10 object-contain"
          />
        </div>

        <h1 className="text-xl font-bold text-brand-blue-900 text-center mb-1">
          Dashboard Meta Ads
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Acesse o painel de campanhas
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha de acesso
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Digite a senha"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange-500 focus:border-brand-orange-500 outline-none transition-all text-gray-900"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">Senha incorreta. Tente novamente.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-orange-500 hover:bg-brand-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
