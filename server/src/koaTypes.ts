import { DefaultContext, DefaultState } from "koa";
import { StorageEngine } from "./storage/storageEngine";

export interface ICustomAppState extends DefaultState {}

export interface ICustomAppContext extends DefaultContext {
  storage: StorageEngine;
}
