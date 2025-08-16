// src/lib/metaapi.ts
import MetaApi from 'metaapi.cloud-sdk';

if (!process.env.METAAPI_TOKEN) {
  throw new Error('METAAPI_TOKEN is missing in env');
}
if (!process.env.METAAPI_ACCOUNT_ID) {
  throw new Error('METAAPI_ACCOUNT_ID is missing in env');
}

let metaApi: MetaApi | null = null;

/** Singleton MetaApi client */
export function getMetaApi() {
  if (!metaApi) {
    metaApi = new MetaApi(process.env.METAAPI_TOKEN);
  }
  return metaApi;
}

/** Defaults (overridable with env) */
export const METAAPI_REGION = process.env.METAAPI_REGION || 'new-york';
export const METAAPI_ACCOUNT_TYPE = process.env.METAAPI_ACCOUNT_TYPE || 'cloud-g1';
export const METAAPI_ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID as string;
