import Koa from "koa";
import KoaBodyParser from "@koa/bodyparser";

import { batchRouter } from "./routes/batch";
import { GcsStorageEngine } from "./storage/gcsStorageEngine";
import { StorageEngine } from "./storage/storageEngine";
import { ICustomAppContext, ICustomAppState } from "./koaTypes";

export class BadFormatException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadFormatException";
  }
}

export function makeApp(storage: StorageEngine) {
  const app = new Koa<ICustomAppState, ICustomAppContext>();

  app.use(
    KoaBodyParser({
      enableTypes: ["json"],
      encoding: "utf-8",
      extendTypes: {
        json: ["application/json", "application/vnd.git-lfs+json"],
      },
    })
  );

  app.use((ctx, next) => {
    ctx.storage = storage;
    next();
  });

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err: any) {
      if (err.name === "BadFormatException") {
        ctx.status = 422;
        ctx.body = {
          message: err.message,
        };
        return;
      }

      console.error(err);
      ctx.status = 500;
      ctx.body = "Internal server error";
    }
  });

  app.use(batchRouter.routes()).use(batchRouter.allowedMethods());

  return app;
}
