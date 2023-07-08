export interface AuthenticatedUrl {
  href: string;
  expiresAt: Date;
}

export abstract class StorageEngine {
  abstract getDownloadUrl(oid: string): Promise<AuthenticatedUrl | null>;
  abstract getUploadUrl(oid: string): Promise<AuthenticatedUrl>;
}
