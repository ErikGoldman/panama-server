import { StorageEngine } from "./storageEngine";

export class GcsStorageEngine extends StorageEngine {
  constructor(private bucketName: string) {
    super();
  }

  override getDownloadUrl(oid: string) {
    return {
      href: `https://storage.googleapis.com/${this.bucketName}/${oid}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    };
  }

  override getUploadUrl(oid: string) {
    return {
      href: `https://storage.googleapis.com/${this.bucketName}/${oid}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    };
  }
}
