import { desc } from "drizzle-orm";
import { cronRuns } from "@portfolio/db";
import { router, adminProcedure } from "./trpc";

export const adminRouter = router({
  cronRuns: adminProcedure.query(({ ctx }) =>
    ctx.db.select().from(cronRuns).orderBy(desc(cronRuns.startedAt)).limit(20)
  ),
});
