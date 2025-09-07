using MtApi5;
using System.Collections.Concurrent;

namespace MtApiService.Services;

public class Mt5ConnectionService
{
    private readonly MtApi5Client _mtApi;
    private readonly ConcurrentDictionary<string, Mt5ConnectionState> _connections;

    public Mt5ConnectionService()
    {
        _mtApi = new MtApi5Client();
        _connections = new ConcurrentDictionary<string, Mt5ConnectionState>();

        _mtApi.ConnectionStateChanged += OnConnectionStateChanged;
        _mtApi.QuoteAdded += OnQuoteAdded;
        _mtApi.QuoteUpdated += OnQuoteUpdated;
    }

    public async Task<bool> ConnectAsync(int port = 8228)
    {
        try
        {
            _mtApi.BeginConnect(port);
            // Wait for connection (simplified)
            await Task.Delay(2000);
            return _mtApi.ConnectionState == Mt5ConnectionState.Connected;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Connection failed: {ex.Message}");
            return false;
        }
    }

    public void Disconnect()
    {
        _mtApi.BeginDisconnect();
    }

    public Mt5ConnectionState ConnectionState => _mtApi.ConnectionState;

    public async Task<MtApi5.AccountInfo?> GetAccountInfoAsync()
    {
        if (_mtApi.ConnectionState != Mt5ConnectionState.Connected)
            return null;

        try
        {
            return await Task.Run(() => _mtApi.GetAccountInfo());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to get account info: {ex.Message}");
            return null;
        }
    }

    private void OnConnectionStateChanged(object? sender, Mt5ConnectionEventArgs e)
    {
        Console.WriteLine($"MT5 Connection state: {e.Status}");
    }

    private void OnQuoteAdded(object? sender, Mt5QuoteEventArgs e)
    {
        Console.WriteLine($"Quote added: {e.Quote.Instrument}");
    }

    private void OnQuoteUpdated(object? sender, Mt5QuoteEventArgs e)
    {
        Console.WriteLine($"Quote updated: {e.Quote.Instrument} - {e.Quote.Bid}/{e.Quote.Ask}");
    }
}