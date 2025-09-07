using MtApi5;
using MtApiService.Models;

namespace MtApiService.Services;

public class Mt5TradeService
{
    private readonly MtApi5Client _mtApi;

    public Mt5TradeService(MtApi5Client mtApi)
    {
        _mtApi = mtApi;
    }

    public async Task<List<Mt5Trade>> GetDealsAsync(DateTime from, DateTime to)
    {
        if (_mtApi.ConnectionState != Mt5ConnectionState.Connected)
            throw new InvalidOperationException("MT5 not connected");

        try
        {
            var deals = await Task.Run(() => _mtApi.GetDeals());
            return deals
                .Where(d => d.TimeClose >= from && d.TimeClose <= to)
                .Select(MapToTrade)
                .ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to get deals: {ex.Message}");
            throw;
        }
    }

    public async Task<Mt5AccountInfo> GetAccountInfoAsync()
    {
        if (_mtApi.ConnectionState != Mt5ConnectionState.Connected)
            throw new InvalidOperationException("MT5 not connected");

        try
        {
            var accountInfo = await Task.Run(() => _mtApi.GetAccountInfo());
            return new Mt5AccountInfo
            {
                Login = accountInfo.Login,
                Balance = accountInfo.Balance,
                Currency = accountInfo.Currency,
                Leverage = accountInfo.Leverage,
                Name = accountInfo.Name
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to get account info: {ex.Message}");
            throw;
        }
    }

    public async Task<bool> PlaceOrderAsync(string symbol, double volume, OrderType orderType)
    {
        if (_mtApi.ConnectionState != Mt5ConnectionState.Connected)
            throw new InvalidOperationException("MT5 not connected");

        try
        {
            MqlTradeResult result = null;
            var success = false;

            switch (orderType)
            {
                case OrderType.Buy:
                    success = await Task.Run(() => _mtApi.Buy(out result, volume, symbol));
                    break;
                case OrderType.Sell:
                    success = await Task.Run(() => _mtApi.Sell(out result, volume, symbol));
                    break;
            }

            return success && result != null && result.Retcode == MqlRetcode.MqlRetcodeDone;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to place order: {ex.Message}");
            throw;
        }
    }

    private Mt5Trade MapToTrade(MtApi5.Deal deal)
    {
        return new Mt5Trade
        {
            Id = deal.Id.ToString(),
            Ticket = deal.Ticket,
            Symbol = deal.Symbol,
            Volume = deal.Volume,
            Profit = deal.Profit,
            PriceOpen = deal.PriceOpen,
            PriceClose = deal.PriceClose,
            Time = deal.Time,
            TimeClose = deal.TimeClose,
            Type = deal.Type.ToString(),
            Comment = deal.Comment
        };
    }
}

public enum OrderType
{
    Buy,
    Sell
}