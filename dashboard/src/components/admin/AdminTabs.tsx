"use client";

import { useState } from "react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import type { Profile } from "@/lib/auth/types";
import { cn } from "@/lib/cn";
import * as ui from "@/lib/tailwind-ui";

type AdminTabsProps = {
  initialPending: Profile[];
};

export function AdminTabs({ initialPending }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "users">("pending");

  return (
    <div className="mt-8">
      <div className="border-b border-surface-raised">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("pending")}
            className={cn(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === "pending"
                ? "border-foreground text-foreground"
                : "border-transparent text-secondary hover:border-hairline hover:text-foreground"
            )}
            aria-current={activeTab === "pending" ? "page" : undefined}
          >
            Pending Approvals
            {initialPending.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                {initialPending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "border-b-2 py-4 px-1 text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === "users"
                ? "border-foreground text-foreground"
                : "border-transparent text-secondary hover:border-hairline hover:text-foreground"
            )}
            aria-current={activeTab === "users" ? "page" : undefined}
          >
            All Users
          </button>
        </nav>
      </div>

      <div className="mt-2">
        {activeTab === "pending" ? (
          <AdminPanel initialPending={initialPending} />
        ) : (
          <UserManagementPanel />
        )}
      </div>
    </div>
  );
}
