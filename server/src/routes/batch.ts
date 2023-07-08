import KoaRouter from "koa-router";
import { ICustomAppContext, ICustomAppState } from "../koaTypes";
import { BadFormatException } from "../app";

export const batchRouter = new KoaRouter<ICustomAppState, ICustomAppContext>();

interface BatchArgs {
  operation: "download" | "upload";
  transfers?: string[];
  ref?: { name: string };
  objects: Array<{
    oid: string;
    size: number;
  }>;
  hash_algo?: string;
}

function verifyArgs(body: Record<string, any>): BatchArgs {
  const out: BatchArgs = {
    operation: "download",
    transfers: ["basic"],
    objects: [],
    hash_algo: "sha256",
  };

  if (typeof body !== "object" || body === null) {
    throw new Error("Expected body to be an object");
  }

  if (!body.hasOwnProperty("operation")) {
    throw new BadFormatException("Expected body to have an operation property");
  }
  if (!["download", "upload"].some((x) => x === body.operation)) {
    throw new BadFormatException(
      "Expected operation to be either download or upload"
    );
  }
  out.operation = body.operation;

  if (body.hasOwnProperty("transfers")) {
    if (
      !Array.isArray(body.transfers) ||
      body.transfers.some((x) => typeof x !== "string")
    ) {
      throw new BadFormatException("Invalid transfers property");
    }
    out.transfers = body.transfers;
  }

  if (body.hasOwnProperty("ref")) {
    if (
      typeof body.ref !== "object" ||
      body.ref === null ||
      !body.ref.hasOwnProperty("name") ||
      typeof body.ref.name !== "string"
    ) {
      throw new BadFormatException("Invalid ref property");
    }
    out.ref = body.ref;
  }

  if (!Array.isArray(body.objects)) {
    throw new BadFormatException("Expected objects property to be an array");
  }
  out.objects = body.objects;

  if (body.hasOwnProperty("hash_algo")) {
    if (typeof body.hash_algo !== "string") {
      throw new BadFormatException("Invalid hash_algo property");
    }
    if (!["sha256"].some((x) => x === body.hash_algo)) {
      throw new BadFormatException("Unknown hash_algo algorithm");
    }
    out.hash_algo = body.hash_algo;
  }

  return out;
}

batchRouter.get("/hi", async (ctx) => {
  console.log("hi!");
  ctx.body = "doot";
  ctx.status = 200;
});

// https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md
batchRouter.post("/batch", async (ctx) => {
  const res = ctx.response;
  /*
  res.headers = {
    "Content-Type": "application/vnd.git-lfs+json",
    Accept: "application/vnd.git-lfs+json",
  };
  */

  const args: BatchArgs = verifyArgs(ctx.request.body);
  const objects = await Promise.all(
    args.objects.map(async (obj) => {
      const urlInfo =
        args.operation === "download"
          ? await ctx.storage.getDownloadUrl(obj.oid)
          : await ctx.storage.getUploadUrl(obj.oid);
      if (urlInfo === null) {
        return {
          oid: obj.oid,
          size: obj.size,
          error: {
            code: 404,
            message: "Object not found",
          },
        };
      }
      return {
        oid: obj.oid,
        size: obj.size,
        authenticated: true,
        actions: {
          [args.operation]: {
            href: urlInfo.href,
            expires_at: urlInfo.expiresAt.toISOString(),
          },
        },
      };
    })
  );

  res.body = {
    transfer: "basic",
    objects,
    hash_algo: "sha256",
  };
  res.status = 200;
  return;
});
