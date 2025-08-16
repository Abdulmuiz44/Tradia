import MetaTrader5 as mt5
import pandas as pd

def fetch_account_trades():
    account_info = mt5.account_info()
    account_data = {
        "login": account_info.login,
        "balance": account_info.balance,
        "currency": account_info.currency,
        "leverage": account_info.leverage
    }

    trades = mt5.history_deals_get()
    trade_list = []
    if trades is not None:
        for t in trades:
            trade_list.append({
                "ticket": t.ticket,
                "symbol": t.symbol,
                "volume": t.volume,
                "profit": t.profit,
                "price_open": t.price_open,
                "price_close": t.price_close,
                "time": t.time
            })
    
    return account_data, trade_list
