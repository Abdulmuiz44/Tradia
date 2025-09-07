using MtApi5;
using MtApiService.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add MT5 service
builder.Services.AddSingleton<Mt5ConnectionService>();
builder.Services.AddSingleton<Mt5TradeService>();

// Configure CORS for Tradia frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowTradia", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://your-tradia-domain.com")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowTradia");
app.UseAuthorization();
app.MapControllers();

app.Run();