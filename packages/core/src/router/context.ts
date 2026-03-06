import type { Db } from "@portfolio/db";

export interface Context {
  db: Db;
  userId: string | null;
}

export interface AuthedContext extends Context {
  userId: string;
}
