export interface AuthenticatedUrl {
  href: string;
  expiresAt: Date;
}

export abstract class StorageEngine {
  abstract getDownloadUrl(oid: string): AuthenticatedUrl | null;
  abstract getUploadUrl(oid: string): AuthenticatedUrl;
}
