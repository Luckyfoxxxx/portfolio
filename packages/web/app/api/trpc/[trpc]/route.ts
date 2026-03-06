import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@portfolio/core/router";
import { createContext } from "../../../../lib/trpc/server.js";

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
