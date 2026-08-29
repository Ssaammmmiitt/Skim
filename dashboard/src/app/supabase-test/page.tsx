"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SupabaseTestPage() {
  useEffect(() => {
    async function testSupabase() {
      const { count, error } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true });

      console.log({ count, error });
    }

    testSupabase();
  }, []);

  return (
    <main>
      <h1>Supabase Test</h1>
      <p>Check the browser console.</p>
    </main>
  );
}