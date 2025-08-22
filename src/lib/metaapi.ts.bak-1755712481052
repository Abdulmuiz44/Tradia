// src/lib/metaapi.ts
import MetaApi, { MetaApi as MetaApiType } from "metaapi.cloud-sdk";

if (!process.env.METAAPI_TOKEN) {
  throw new Error("METAAPI_TOKEN is missing in env");
}
if (!process.env.METAAPI_ACCOUNT_ID) {
  throw new Error("METAAPI_ACCOUNT_ID is missing in env");
}

let metaApiClient: MetaApiType | null = null;

export function getMetaApi(): MetaApiType {
  if (!metaApiClient) {
    metaApiClient = new MetaApi(process.env.METAAPI_TOKEN);
  }
  return metaApiClient;
}

export const metaapi: MetaApiType = getMetaApi();

export const METAAPI_REGION: string = process.env.METAAPI_REGION || "new-york";
export const METAAPI_ACCOUNT_TYPE: string = process.env.METAAPI_ACCOUNT_TYPE || "cloud-g1";
export const METAAPI_ACCOUNT_ID: string = process.env.METAAPI_ACCOUNT_ID as string;
