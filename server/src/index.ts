import { makeApp } from "./app";
import { GcsStorageEngine } from "./storage/gcsStorageEngine";

const port = 3000;
console.log("Listening", port);
makeApp(new GcsStorageEngine("git-lfs")).listen(port);
