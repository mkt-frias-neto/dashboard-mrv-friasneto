"use client";

import { useState, useEffect } from "react";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";

const SESSION_KEY = "dash_session";
const SESSION_HOURS = 4;

function isSessionValid(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const { expiresAt } = JSON.parse(raw);
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

function createSession() {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000 })
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthenticated(isSessionValid());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authenticated) {
    return (
      <Login
        onSuccess={() => {
          createSession();
          setAuthenticated(true);
        }}
      />
    );
  }

  return <Dashboard />;
}
