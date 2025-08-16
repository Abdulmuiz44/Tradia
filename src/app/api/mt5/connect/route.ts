import { NextResponse } from 'next/server';
import { getMetaApi, METAAPI_ACCOUNT_ID } from '@/lib/metaapi';

export async function POST() {
  try {
    const metaApi = getMetaApi();

    // Use account id from .env
    const account = await metaApi.metatraderAccountApi.getAccount(METAAPI_ACCOUNT_ID);

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found. Check your METAAPI_ACCOUNT_ID' },
        { status: 404 }
      );
    }

    // Deploy account if not deployed
    if (account.state !== 'DEPLOYED') {
      console.log('Deploying account...');
      await account.deploy();
      await account.waitConnected();
    }

    const connection = account.getRPCConnection();
    await connection.connect();

    return NextResponse.json({
      success: true,
      accountId: METAAPI_ACCOUNT_ID,
      state: account.state,
      connection: connection.isConnected(),
    });
  } catch (err: any) {
    console.error('MetaApi connect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
