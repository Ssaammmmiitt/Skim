"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Records a visit for the current user each time they navigate to a new page.
 * The POST is fire-and-forget — errors are swallowed to avoid UI disruption.
 * The server endpoint is idempotent (one row per user per day).
 */
function ActivityRecorder() {
  useEffect(() => {
    fetch("/api/profile/activity", { method: "POST" }).catch(() => {
      // Silently ignore — streak accuracy is best-effort
    });
  }, []);

  return null;
}

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ActivityRecorder />
      {children}
    </motion.div>
  );
}
