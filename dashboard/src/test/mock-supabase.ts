import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

type QueryResult = { data: unknown; error: { message: string } | null };

type TableHandler = {
  maybeSingle?: () => Promise<QueryResult>;
  then?: (resolve: (value: QueryResult) => void) => void;
};

export function createQueryBuilder(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    or: vi.fn(() => builder),
    textSearch: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

export function createMockSupabase(
  handlers: Record<string, () => ReturnType<typeof createQueryBuilder>>
): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      const handler = handlers[table];
      if (!handler) {
        return createQueryBuilder({ data: null, error: null });
      }
      return handler();
    }),
    auth: {
      getUser: vi.fn(),
    },
  } as unknown as SupabaseClient;
}
