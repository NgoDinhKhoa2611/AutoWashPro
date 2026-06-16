using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.Helpers;
using System.IO;
using System.Collections.Generic;
using System.Linq;

namespace Auto_Wash
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            // All DB columns are "timestamp without time zone"; this makes Npgsql 6+ treat
            // DateTime values as local timestamps (no UTC conversion) to match that schema.
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

            var builder = WebApplication.CreateBuilder(args);

            builder.Configuration
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile(
                    $"appsettings.{builder.Environment.EnvironmentName}.json",
                    optional: true,
                    reloadOnChange: true);

            if (builder.Environment.IsDevelopment())
            {
                builder.Configuration.AddUserSecrets<Program>();
            }

            builder.Configuration.AddEnvironmentVariables();

            // Register Custom File Logger Provider
            var debugBePath = Path.Combine(builder.Environment.ContentRootPath, "debug_be.log");
            builder.Logging.AddProvider(new FileLoggerProvider(debugBePath));

            // Add services to the container.
            builder.Services.AddControllersWithViews();

            // Register CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("ReactPolicy", policy =>
                {
                    policy.WithOrigins(
                              "http://localhost:5173",
                              "http://127.0.0.1:5173",
                              "http://localhost:3000"
                          )
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                });
            });

            builder.Services.AddDbContext<AutoWashDbContext>(options =>
            {
                var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

                options.UseNpgsql(connectionString, npgsqlOpts =>
                {
                    npgsqlOpts.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorCodesToAdd: null);
                })
                .UseLowerCaseNamingConvention();
            });

            // Register HttpContextAccessor and Services
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddScoped<AuthContextService>();
            builder.Services.AddScoped<AccountService>();
            builder.Services.AddScoped<VehicleService>();
            builder.Services.AddScoped<OtpService>();
            builder.Services.AddScoped<WelcomeRewardService>();
            builder.Services.AddScoped<Auto_Wash.Services.BookingService>();
            builder.Services.AddScoped<AdminQueueService>();
            builder.Services.AddScoped<CustomerService>();
            builder.Services.AddScoped<AdminService>();

            // Session support
            builder.Services.AddDistributedMemoryCache();
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromHours(8);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
                app.UseHttpsRedirection();
            }

            app.UseDefaultFiles(); // Enables serving index.html as default page
            app.UseStaticFiles();

            app.UseRouting();

            app.UseCors("ReactPolicy");

            app.UseSession();

            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");
            
            app.MapFallbackToFile("index.html"); // Fallback for React Router client routes

            // Perform Database Updates (revert motorcycle services & correct prices)
            using (var scope = app.Services.CreateScope())
            {
                try
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<AutoWashDbContext>();
                    
                    // 1. Delete motorcycle addon services if they exist
                    var motoServiceNames = new[] { "Vệ sinh sên xích", "Bôi trơn sên", "Rửa mâm xe máy", "Dưỡng nhựa nhám xe máy" };
                    var motoServices = dbContext.Services.Where(s => motoServiceNames.Contains(s.ServiceName)).ToList();
                    if (motoServices.Any())
                    {
                        foreach (var ms in motoServices)
                        {
                            var relatedBookings = dbContext.BookingServices.Where(bs => bs.ServiceId == ms.ServiceId).ToList();
                            dbContext.BookingServices.RemoveRange(relatedBookings);
                            
                            var relatedRewards = dbContext.Rewards.Where(r => r.ServiceId == ms.ServiceId).ToList();
                            dbContext.Rewards.RemoveRange(relatedRewards);

                            var relatedPerks = dbContext.TierPerks.Where(tp => tp.ServiceId == ms.ServiceId).ToList();
                            dbContext.TierPerks.RemoveRange(relatedPerks);
                        }
                        dbContext.Services.RemoveRange(motoServices);
                        await dbContext.SaveChangesAsync();
                        Console.WriteLine("[DB Update] Successfully removed motorcycle services.");
                    }

                    // 2. Update existing car services prices to market prices
                    var servicePriceUpdates = new Dictionary<string, int>
                    {
                        { "Rửa Premium", 200000 },
                        { "Rửa Deluxe", 450000 },
                        { "Nano Ceramic", 200000 },
                        { "Làm thơm cabin", 80000 },
                        { "Đánh bóng la-zăng", 120000 },
                        { "Dưỡng da ghế", 150000 },
                        { "Xúc bình xăng", 180000 }
                    };

                    bool updated = false;
                    foreach (var pair in servicePriceUpdates)
                    {
                        var service = dbContext.Services.FirstOrDefault(s => s.ServiceName.Trim().ToLower() == pair.Key.Trim().ToLower());
                        if (service != null && service.BasePrice != pair.Value)
                        {
                            service.BasePrice = pair.Value;
                            updated = true;
                        }
                    }

                    if (updated)
                    {
                        await dbContext.SaveChangesAsync();
                        Console.WriteLine("[DB Update] Successfully updated car services prices.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DB Update Error] {ex.Message}");
                }
            }

            await app.RunAsync();
        }
    }
}
