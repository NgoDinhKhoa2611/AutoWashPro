using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;

namespace Auto_Wash
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

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
                var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
                options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 30)));
            });

            // Session support
            builder.Services.AddDistributedMemoryCache();
            builder.Services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromHours(8);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
            });

            var app = builder.Build();

            // Seed default admin account on startup
            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AutoWashDbContext>();
                await SeedAdminAsync(db);
            }

            // Configure the HTTP request pipeline.
            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
            }

            app.UseHttpsRedirection();
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

            await app.RunAsync();
        }

        private static async Task SeedAdminAsync(AutoWashDbContext db)
        {
            try
            {
                const string adminEmail = "admin@autowash.vn";
                if (!await db.Accounts.AnyAsync(a => a.Email == adminEmail))
                {
                    db.Accounts.Add(new Account
                    {
                        Email = adminEmail,
                        FullName = "Admin AutoWash",
                        PasswordHash = HashSHA256("Admin@123"),
                        Role = 1,
                        IsActive = true,
                        CreatedAt = DateTime.Now
                    });
                    await db.SaveChangesAsync();
                }
            }
            catch
            {
                // DB not available at startup — skip seed
            }
        }

        private static string HashSHA256(string input)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            var bytes = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes).ToLower();
        }
    }
}

