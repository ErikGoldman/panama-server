import { StorageEngine } from "./storageEngine";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();

export class GcsStorageEngine extends StorageEngine {
  constructor(private bucketName: string) {
    super();
  }

  private async makeUrl(oid: string, action: "read" | "write") {
    const expires = Date.now() + 60 * 60 * 1000; // one hour
    const [signedUrl] = await storage
      .bucket(this.bucketName)
      .file(`oid/${oid}`)
      .getSignedUrl({
        version: "v4",
        action,
        expires,
      });

    return {
      href: signedUrl,
      expiresAt: new Date(expires),
    };
  }

  override async getDownloadUrl(oid: string) {
    return this.makeUrl(oid, "read");
  }

  override async getUploadUrl(oid: string) {
    return this.makeUrl(oid, "write");
  }
}
