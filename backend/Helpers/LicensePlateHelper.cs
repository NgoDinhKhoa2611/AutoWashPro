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

            // Vietnamese plate formats (after normalization):
            //   Cars/trucks : [2 digits][1 letter][5 digits]        e.g. 51A12345   (8 chars)
            //   Motorcycles : [2 digits][1 letter][4 digits]        e.g. 51A1234    (7 chars)
            //   New series  : [2 digits][1 letter][1 digit][4 digits] e.g. 29H12345 (8 chars)
            //   2-letter    : [2 digits][2 letters][4-5 digits]     e.g. 29AB12345  (9 chars)
            var match = Regex.Match(cleanPlate, @"^(\d{2})[A-Z]{1,2}\d{4,5}$");
            if (!match.Success) return false;

            string provinceCode = match.Groups[1].Value;
            var validProvinces = new HashSet<string>
            {
                "11", "12", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "40", "41", "43", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "80", "81", "82", "83", "84", "85", "86", "88", "89", "90", "92", "93", "94", "95", "97", "98", "99"
            };

            return validProvinces.Contains(provinceCode);
        }
    }
}
