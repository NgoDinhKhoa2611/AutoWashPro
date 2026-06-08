using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Supabase;
using Auto_Wash.Data.Entities;
using Auto_Wash.Services;
using Auto_Wash.Helpers;
using System.IO;

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
                    policy.WithOrigins("http://localhost:5173")
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                });
            });

            // Register database context
            builder.Services.AddDbContext<AutoWashDbContext>(options =>
            {                
                var connectionString = $"Host=aws-1-ap-northeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.chsdplwgdyfwavepibwo;Password=eUTvJp#-WFvpdu5;SSL Mode=Require;Trust Server Certificate=true";
                options.UseNpgsql(connectionString)
                       .UseLowerCaseNamingConvention(); // Map tất cả sang lowercase
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

            // Session support
            builder.Services.AddDistributedMemoryCache();
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromHours(8);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
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
            app.UseSession();
            app.UseRouting();
            app.UseCors("ReactPolicy");
            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");
            
            app.MapFallbackToFile("index.html"); // Fallback for React Router client routes

            if (app.Environment.IsDevelopment())
            {
                app.Lifetime.ApplicationStarted.Register(() =>
                {
                    try
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = "http://localhost:5023",
                            UseShellExecute = true
                        });
                    }
                    catch { }
                });
            }

            await app.RunAsync();
        }
        }
}

