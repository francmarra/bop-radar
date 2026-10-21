using BopRadar.Api.Endpoints;
using BopRadar.Api;
using BopRadar.Data;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default is not set");

if (args.Length > 0 && args[0] == "import")
    return await ImportCommand.RunAsync(args, connectionString);

builder.Services.AddDbContext<BopRadarDbContext>(o => DbSetup.Configure(o, connectionString));
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks().AddDbContextCheck<BopRadarDbContext>();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("https://francmarra.github.io", "http://localhost:5173")
    .WithMethods("GET")));

var app = builder.Build();

app.UseExceptionHandler(); // generic 500 problem+json; details only in the log
app.UseStatusCodePages();
app.UseCors();

app.MapOpenApi();
app.MapScalarApiReference("/docs");
app.MapHealthChecks("/health");

RouteGroupBuilder api = app.MapGroup("/api/v1");
api.MapCars();

app.Run();
return 0;

public partial class Program;
