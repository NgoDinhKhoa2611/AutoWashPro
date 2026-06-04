using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Auto_Wash.Helpers
{
    public static class LicensePlateHelper
    {
        public static string Normalize(string licensePlate)
        {
            if (string.IsNullOrWhiteSpace(licensePlate)) return string.Empty;
            return licensePlate.Trim().ToUpper().Replace(" ", "").Replace("-", "").Replace(".", "");
        }

        public static bool IsValidVietnameseLicensePlate(string? licensePlate)
        {
            if (string.IsNullOrWhiteSpace(licensePlate)) return false;

            // Normalize: remove space, dash, dot, and convert to uppercase
            string cleanPlate = Normalize(licensePlate);

            // Match format XXA12345 (3 alphanumeric characters + 5 digits)
            var match = Regex.Match(cleanPlate, @"^([A-Z0-9]{3})(\d{5})$");
            if (!match.Success) return false;

            string prefix = match.Groups[1].Value;
            if (prefix.Length < 2) return false;

            string provinceCode = prefix.Substring(0, 2);
            var validProvinces = new HashSet<string>
            {
                "11", "12", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "40", "41", "43", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "88", "89", "90", "92", "93", "94", "95", "97", "98", "99"
            };

            return validProvinces.Contains(provinceCode);
        }
    }
}
