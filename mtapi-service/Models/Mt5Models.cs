namespace MtApiService.Models;

public class Mt5Trade
{
    public string Id { get; set; } = string.Empty;
    public long Ticket { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public double Volume { get; set; }
    public double Profit { get; set; }
    public double PriceOpen { get; set; }
    public double PriceClose { get; set; }
    public DateTime Time { get; set; }
    public DateTime TimeClose { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Comment { get; set; } = string.Empty;
}

public class Mt5AccountInfo
{
    public long Login { get; set; }
    public double Balance { get; set; }
    public string Currency { get; set; } = string.Empty;
    public int Leverage { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class SyncRequest
{
    public string UserId { get; set; } = string.Empty;
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}

public class SyncResponse
{
    public bool Success { get; set; }
    public List<Mt5Trade> Trades { get; set; } = new();
    public Mt5AccountInfo? AccountInfo { get; set; }
    public string? Error { get; set; }
}