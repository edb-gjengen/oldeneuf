"use client";

import { useState } from "react";

interface LoginFormProps {
  onLogin: () => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onLogin();
      } else {
        setError("Ugyldig passord");
      }
    } catch {
      setError("Noe gikk galt :(");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-neuf-black">
      <h1 className="text-5xl font-bold text-center mb-20 text-white">
        Oldeneuf?
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-md font-medium text-gray-300 mb-1"
          >
            Passord
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            className="w-full px-3 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={isLoading}
          />
          {error && <p className="text-red-500 text-md mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full font-bold bg-golden-orange text-neuf-black py-4 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Logger inn..." : "Logg inn"}
        </button>
      </form>
    </div>
  );
}
