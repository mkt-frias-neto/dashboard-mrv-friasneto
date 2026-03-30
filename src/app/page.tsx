"use client";

import { useState } from "react";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}
