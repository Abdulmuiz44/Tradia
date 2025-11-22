import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const supabase = createPagesServerClient({ req, res });

    // Check authentication
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const user_id = session.user.id;

    if (req.method === 'POST') {
        try {
            const tradeData = req.body;

            // Ensure user_id is set
            const tradeToInsert = {
                ...tradeData,
                user_id,
                // Ensure numeric fields are actually numbers or null
                pnl: tradeData.pnl === '' ? null : tradeData.pnl,
                entryprice: tradeData.entryPrice === '' ? null : tradeData.entryPrice,
                exitprice: tradeData.exitPrice === '' ? null : tradeData.exitPrice,
                stoplossprice: tradeData.stopLossPrice === '' ? null : tradeData.stopLossPrice,
                takeprofitprice: tradeData.takeProfitPrice === '' ? null : tradeData.takeProfitPrice,
                lotsize: tradeData.lotSize === '' ? null : tradeData.lotSize,
                commission: tradeData.commission === '' ? null : tradeData.commission,
                swap: tradeData.swap === '' ? null : tradeData.swap,
                resultrr: tradeData.resultRR === '' ? null : tradeData.resultRR,
                // Map camelCase to snake_case/lowercase if needed by DB (Supabase handles JSON keys if they match column names, but let's be safe with what we saw in TradeContext)
                // Actually, TradeContext.ts transformTradeForBackend already handles mapping to lowercase keys like 'entryprice', 'opentime' etc.
                // So we can just pass the body if it's already transformed.
                // However, if the frontend sends raw Trade object, we might need to transform it here or ensure frontend transforms it.
                // Looking at TradeContext.ts: addTrade calls JSON.stringify(trade). 
                // But wait, TradeContext.ts `addTrade` sends the raw `Trade` object (camelCase).
                // The `transformTradeForBackend` function exists but is used in `importTrades`, NOT in `addTrade`.
                // So `addTrade` sends camelCase. We need to map it here or update `addTrade` to use `transformTradeForBackend`.
                // Updating `addTrade` in frontend is cleaner, but let's support both here or map it.
                // Let's map it here to be safe.
            };

            // Mapping camelCase to DB columns (lowercase based on schema we saw/created)
            const dbTrade = {
                user_id,
                symbol: tradeToInsert.symbol,
                direction: tradeToInsert.direction,
                ordertype: tradeToInsert.orderType,
                opentime: tradeToInsert.openTime,
                closetime: tradeToInsert.closeTime,
                session: tradeToInsert.session,
                lotsize: tradeToInsert.lotSize,
                entryprice: tradeToInsert.entryPrice,
                exitprice: tradeToInsert.exitPrice,
                stoplossprice: tradeToInsert.stopLossPrice,
                takeprofitprice: tradeToInsert.takeProfitPrice,
                pnl: tradeToInsert.pnl,
                profitloss: tradeToInsert.profitLoss,
                resultrr: tradeToInsert.resultRR,
                outcome: tradeToInsert.outcome,
                duration: tradeToInsert.duration,
                reasonfortrade: tradeToInsert.reasonForTrade,
                emotion: tradeToInsert.emotion,
                journalnotes: tradeToInsert.journalNotes,
                notes: tradeToInsert.notes,
                strategy: tradeToInsert.strategy,
                beforescreenshoturl: tradeToInsert.beforeScreenshotUrl,
                afterscreenshoturl: tradeToInsert.afterScreenshotUrl,
                commission: tradeToInsert.commission,
                swap: tradeToInsert.swap,
                pinned: tradeToInsert.pinned,
                tags: tradeToInsert.tags,
                reviewed: tradeToInsert.reviewed,
            };

            // Remove undefined keys
            Object.keys(dbTrade).forEach(key => (dbTrade as any)[key] === undefined && delete (dbTrade as any)[key]);

            const { data, error } = await supabase
                .from('trades')
                .insert([dbTrade])
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({ trade: data });
        } catch (error: any) {
            console.error('Error adding trade:', error);
            return res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'PATCH') {
        try {
            const tradeData = req.body;
            const { id, ...updates } = tradeData;

            if (!id) {
                return res.status(400).json({ error: 'Trade ID is required' });
            }

            // Map updates to DB columns
            const dbUpdates: any = {};
            if (updates.symbol !== undefined) dbUpdates.symbol = updates.symbol;
            if (updates.direction !== undefined) dbUpdates.direction = updates.direction;
            if (updates.orderType !== undefined) dbUpdates.ordertype = updates.orderType;
            if (updates.openTime !== undefined) dbUpdates.opentime = updates.openTime;
            if (updates.closeTime !== undefined) dbUpdates.closetime = updates.closeTime;
            if (updates.session !== undefined) dbUpdates.session = updates.session;
            if (updates.lotSize !== undefined) dbUpdates.lotsize = updates.lotSize;
            if (updates.entryPrice !== undefined) dbUpdates.entryprice = updates.entryPrice;
            if (updates.exitPrice !== undefined) dbUpdates.exitprice = updates.exitPrice;
            if (updates.stopLossPrice !== undefined) dbUpdates.stoplossprice = updates.stopLossPrice;
            if (updates.takeProfitPrice !== undefined) dbUpdates.takeprofitprice = updates.takeProfitPrice;
            if (updates.pnl !== undefined) dbUpdates.pnl = updates.pnl;
            if (updates.profitLoss !== undefined) dbUpdates.profitloss = updates.profitLoss;
            if (updates.resultRR !== undefined) dbUpdates.resultrr = updates.resultRR;
            if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome;
            if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
            if (updates.reasonForTrade !== undefined) dbUpdates.reasonfortrade = updates.reasonForTrade;
            if (updates.emotion !== undefined) dbUpdates.emotion = updates.emotion;
            if (updates.journalNotes !== undefined) dbUpdates.journalnotes = updates.journalNotes;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            if (updates.strategy !== undefined) dbUpdates.strategy = updates.strategy;
            if (updates.beforeScreenshotUrl !== undefined) dbUpdates.beforescreenshoturl = updates.beforeScreenshotUrl;
            if (updates.afterScreenshotUrl !== undefined) dbUpdates.afterscreenshoturl = updates.afterScreenshotUrl;
            if (updates.commission !== undefined) dbUpdates.commission = updates.commission;
            if (updates.swap !== undefined) dbUpdates.swap = updates.swap;
            if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;
            if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
            if (updates.reviewed !== undefined) dbUpdates.reviewed = updates.reviewed;

            dbUpdates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('trades')
                .update(dbUpdates)
                .eq('id', id)
                .eq('user_id', user_id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({ trade: data });
        } catch (error: any) {
            console.error('Error updating trade:', error);
            return res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'DELETE') {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: 'Trade ID is required' });
            }

            const { error } = await supabase
                .from('trades')
                .delete()
                .eq('id', id)
                .eq('user_id', user_id);

            if (error) throw error;

            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Error deleting trade:', error);
            return res.status(500).json({ error: error.message });
        }
    } else {
        res.setHeader('Allow', ['POST', 'PATCH', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
