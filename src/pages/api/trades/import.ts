import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const supabase = createPagesServerClient({ req, res });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user_id = session.user.id;

    try {
        const { trades, source } = req.body;

        if (!Array.isArray(trades) || trades.length === 0) {
            return res.status(400).json({ error: 'No trades provided' });
        }

        // Fetch existing trades to check for duplicates
        // We'll check duplicates based on a composite key: symbol + open_time + entry_price + direction
        // Or if 'id' is provided and matches (though imported IDs might be random)

        const { data: existingTrades, error: fetchError } = await supabase
            .from('trades')
            .select('symbol, opentime, entryprice, direction, id')
            .eq('user_id', user_id);

        if (fetchError) throw fetchError;

        const existingSet = new Set(
            existingTrades?.map(t =>
                `${t.symbol}-${new Date(t.opentime).getTime()}-${t.entryprice}-${t.direction}`
            )
        );

        const tradesToInsert = trades
            .filter((t: any) => {
                // Create signature for this trade
                // Note: t.opentime might be ISO string
                const openTimeVal = t.opentime ? new Date(t.opentime).getTime() : 0;
                const sig = `${t.symbol}-${openTimeVal}-${t.entryprice}-${t.direction}`;

                // Check if duplicate
                if (existingSet.has(sig)) {
                    return false;
                }
                return true;
            })
            .map((t: any) => ({
                ...t,
                user_id,
                // Ensure we don't try to insert 'id' if it's a placeholder like 'imported-...'
                id: (t.id && t.id.length === 36) ? t.id : undefined, // Only keep valid UUIDs
            }));

        if (tradesToInsert.length === 0) {
            return res.status(200).json({ newTrades: 0, message: 'All trades were duplicates' });
        }

        const { error: insertError } = await supabase
            .from('trades')
            .insert(tradesToInsert);

        if (insertError) throw insertError;

        return res.status(200).json({ newTrades: tradesToInsert.length });

    } catch (error: any) {
        console.error('Error importing trades:', error);
        return res.status(500).json({ error: error.message });
    }
}
