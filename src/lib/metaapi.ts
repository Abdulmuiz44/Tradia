// src/lib/metaapi.ts
import MetaApi from 'metaapi.cloud-sdk';

if (!process.env.METAAPI_TOKEN) {
  throw new Error('METAAPI_TOKEN is missing in env');
}

let metaApi: MetaApi | null = null;

/** Singleton MetaApi client */
export function getMetaApi() {
  if (!metaApi) {
    metaApi = new MetaApi(process.env.METAAPI_TOKEN);
  }
  return metaApi;
}

/** Defaults you can override with env */
export const METAAPI_REGION = process.env.METAAPI_REGION || 'new-york';
export const METAAPI_ACCOUNT_TYPE = process.env.METAAPI_ACCOUNT_TYPE || 'cloud-g1'; // or 'cloud-g1-cf'
