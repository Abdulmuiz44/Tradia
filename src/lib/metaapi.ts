// src/lib/metaapi.ts
let metaApiClient: any = null;

export async function getMetaApi(): Promise<any> {
  if (metaApiClient) return metaApiClient;
  if (!process.env.METAAPI_TOKEN) {
    throw new Error("METAAPI_TOKEN is missing in env");
  }
  try {
    // dynamic import to avoid executing browser-only code at module-load time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import("metaapi.cloud-sdk");
    const MetaApi = (mod as any).default ?? mod;
    metaApiClient = new MetaApi(process.env.METAAPI_TOKEN ?? "");
    return metaApiClient;
  } catch (err) {
    console.error("Failed to load metaapi.cloud-sdk:", err);
    throw err;
  }
}

export const METAAPI_REGION: string = process.env.METAAPI_REGION || "new-york";
export const METAAPI_ACCOUNT_TYPE: string = process.env.METAAPI_ACCOUNT_TYPE || "cloud-g1";
export const METAAPI_ACCOUNT_ID: string = process.env.METAAPI_ACCOUNT_ID as string;
