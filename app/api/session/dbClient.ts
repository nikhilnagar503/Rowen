import type { SessionRecord } from './types';

export type GenericSupabase = {
  from: (table: string) => {
    select: (fields: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{
          data: SessionRecord[] | null;
          error: unknown;
        }>;
      };
      single: () => Promise<{ data: SessionRecord | null; error: unknown }>;
    };
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          select: (fields: string) => { single: () => Promise<{ data: SessionRecord | null; error: unknown }> };
        };
      };
    };
    insert: (payload: Record<string, unknown>) => {
      select: (fields: string) => { single: () => Promise<{ data: SessionRecord | null; error: unknown }> };
    };
  };
};
