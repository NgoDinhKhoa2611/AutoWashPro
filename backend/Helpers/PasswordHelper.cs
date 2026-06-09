using System.Security.Cryptography;
using System.Text;
using System.Linq;

namespace Auto_Wash.Helpers
{
    public static class PasswordHelper
    {
        /// <summary>
        /// Hashes password using BCrypt.
        /// </summary>
        public static string HashPassword(string password)
        {
            if (string.IsNullOrEmpty(password)) return string.Empty;
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        /// <summary>
        /// Verifies a password against a BCrypt or legacy SHA256 hash.
        /// </summary>
        public static bool VerifyPassword(string password, string hash)
        {
            if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hash)) return false;

            if (IsLegacyHash(hash))
            {
                // Verify using SHA256
                string sha256Hash = GetSha256Hash(password);
                return string.Equals(sha256Hash, hash, StringComparison.OrdinalIgnoreCase);
            }

            try
            {
                // Verify using BCrypt
                return BCrypt.Net.BCrypt.Verify(password, hash);
            }
            catch
            {
                return false;
            }
        }

        public static bool IsLegacyHash(string hash)
        {
            return !string.IsNullOrWhiteSpace(hash)
                && hash.Length == 64
                && hash.All(Uri.IsHexDigit);
        }

        private static string GetSha256Hash(string input)
        {
            using (var sha256 = SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
                var builder = new StringBuilder();
                for (int i = 0; i < bytes.Length; i++)
                {
                    builder.Append(bytes[i].ToString("x2"));
                }
                return builder.ToString();
            }
        }
    }
}
