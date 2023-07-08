import request from "supertest";

import Koa from "koa";
import { makeApp } from "../app";
import { StorageEngine } from "../storage/storageEngine";

describe("batch API", () => {
  let storage: {
    getDownloadUrl: jest.Mock;
    getUploadUrl: jest.Mock;
  };
  let app: Koa<any, any>;

  beforeEach(() => {
    jest.useFakeTimers();
    storage = {
      getDownloadUrl: jest.fn(),
      getUploadUrl: jest.fn(),
    };
    app = makeApp(storage);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makePostRequest(url: string, body: any) {
    return request(app.callback())
      .post(url)
      .send(body)
      .set("Content-Type", "application/vnd.git-lfs+json")
      .set("Accept", "application/vnd.git-lfs+json");
  }

  test("bad operation", async () => {
    const response = await makePostRequest("/batch", {
      operation: "dingle",
      transfers: ["basic"],
      ref: { name: "refs/heads/main" },
      objects: [
        {
          oid: "12345678",
          size: 123,
        },
      ],
      hash_algo: "sha256",
    });
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      message: expect.any(String),
    });
  });

  test("bad algo", async () => {
    const response = await makePostRequest("/batch", {
      operation: "download",
      transfers: ["basic"],
      ref: { name: "refs/heads/main" },
      objects: [
        {
          oid: "12345678",
          size: 123,
        },
      ],
      hash_algo: "dingle",
    });
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      message: expect.any(String),
    });
  });

  test("download one object", async () => {
    storage.getDownloadUrl.mockResolvedValue({
      href: "https://download.com/12345678",
      expiresAt: new Date("2023-07-09T03:23:24.808Z"),
    });

    const response = await makePostRequest("/batch", {
      operation: "download",
      transfers: ["basic"],
      ref: { name: "refs/heads/main" },
      objects: [
        {
          oid: "12345678",
          size: 123,
        },
      ],
      hash_algo: "sha256",
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      hash_algo: "sha256",
      objects: [
        {
          actions: {
            download: {
              expires_at: "2023-07-09T03:23:24.808Z",
              href: "https://download.com/12345678",
            },
          },
          authenticated: true,
          oid: "12345678",
          size: 123,
        },
      ],
      transfer: "basic",
    });
    expect(storage.getUploadUrl).not.toHaveBeenCalled();
    expect(storage.getDownloadUrl).toHaveBeenCalledTimes(1);
    expect(storage.getDownloadUrl).toHaveBeenCalledWith("12345678");
  });

  test("download two objects, both success", async () => {
    storage.getDownloadUrl
      .mockResolvedValueOnce({
        href: "https://download.com/12345678",
        expiresAt: new Date("2023-07-09T03:23:24.808Z"),
      })
      .mockResolvedValueOnce({
        href: "https://download.com/abc",
        expiresAt: new Date("2028-07-09T03:23:24.808Z"),
      });

    const response = await makePostRequest("/batch", {
      operation: "download",
      transfers: ["basic"],
      ref: { name: "refs/heads/main" },
      objects: [
        {
          oid: "12345678",
          size: 123,
        },
        {
          oid: "abc",
          size: 123,
        },
      ],
      hash_algo: "sha256",
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      hash_algo: "sha256",
      objects: [
        {
          actions: {
            download: {
              expires_at: "2023-07-09T03:23:24.808Z",
              href: "https://download.com/12345678",
            },
          },
          authenticated: true,
          oid: "12345678",
          size: 123,
        },
        {
          actions: {
            download: {
              expires_at: "2028-07-09T03:23:24.808Z",
              href: "https://download.com/abc",
            },
          },
          authenticated: true,
          oid: "abc",
          size: 123,
        },
      ],
      transfer: "basic",
    });
    expect(storage.getUploadUrl).not.toHaveBeenCalled();
    expect(storage.getDownloadUrl).toHaveBeenCalledTimes(2);
    expect(storage.getDownloadUrl).toHaveBeenCalledWith("12345678");
    expect(storage.getDownloadUrl).toHaveBeenCalledWith("abc");
  });

  test("download two objects, one fail", async () => {
    storage.getDownloadUrl.mockResolvedValueOnce(null).mockResolvedValueOnce({
      href: "https://download.com/abc",
      expiresAt: new Date("2023-07-09T03:23:24.808Z"),
    });

    const response = await makePostRequest("/batch", {
      operation: "download",
      transfers: ["basic"],
      ref: { name: "refs/heads/main" },
      objects: [
        {
          oid: "12345678",
          size: 123,
        },
        {
          oid: "abc",
          size: 123,
        },
      ],
      hash_algo: "sha256",
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      hash_algo: "sha256",
      objects: [
        {
          oid: "12345678",
          size: 123,
          error: {
            code: 404,
            message: "Object not found",
          },
        },
        {
          actions: {
            download: {
              expires_at: "2023-07-09T03:23:24.808Z",
              href: "https://download.com/abc",
            },
          },
          authenticated: true,
          oid: "abc",
          size: 123,
        },
      ],
      transfer: "basic",
    });
    expect(storage.getUploadUrl).not.toHaveBeenCalled();
    expect(storage.getDownloadUrl).toHaveBeenCalledTimes(2);
    expect(storage.getDownloadUrl).toHaveBeenCalledWith("12345678");
    expect(storage.getDownloadUrl).toHaveBeenCalledWith("abc");
  });

  test("upload two objects", async () => {
    storage.getUploadUrl
      .mockResolvedValueOnce({
        href: "https://upload.com/1234",
        expiresAt: new Date("2023-07-09T03:23:24.808Z"),
      })
      .mockResolvedValueOnce({
        href: "https://upload.com/abc",
        expiresAt: new Date("2028-07-09T03:23:24.808Z"),
      });

    const response = await makePostRequest("/batch", {
      operation: "upload",
      transfers: ["basic"],
      ref: { name: "refs/heads/main" },
      objects: [
        {
          oid: "1234",
          size: 123,
        },
        {
          oid: "abc",
          size: 123,
        },
      ],
      hash_algo: "sha256",
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      hash_algo: "sha256",
      objects: [
        {
          oid: "1234",
          size: 123,
          actions: {
            upload: {
              expires_at: "2023-07-09T03:23:24.808Z",
              href: "https://upload.com/1234",
            },
          },
        },
        {
          actions: {
            upload: {
              expires_at: "2028-07-09T03:23:24.808Z",
              href: "https://upload.com/abc",
            },
          },
          authenticated: true,
          oid: "abc",
          size: 123,
        },
      ],
      transfer: "basic",
    });
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
    expect(storage.getUploadUrl).toHaveBeenCalledTimes(2);
    expect(storage.getUploadUrl).toHaveBeenCalledWith("1234");
    expect(storage.getUploadUrl).toHaveBeenCalledWith("abc");
  });
});
