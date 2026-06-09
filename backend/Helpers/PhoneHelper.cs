using System.Text.RegularExpressions;

namespace Auto_Wash.Helpers
{
    public static class PhoneHelper
    {
        // Vietnamese mobile prefixes (no international prefix, 10 digits total):
        //   Viettel  : 032-039, 086, 096, 097, 098
        //   Mobifone : 070, 076-079, 089, 090, 093
        //   Vinaphone: 081-085, 088, 091, 094
        //   Vietnamobile: 052, 056, 058, 092
        //   Gmobile  : 059, 099
        //   Reddi    : 055
        private static readonly Regex VnPhoneRegex = new(
            @"^0(3[2-9]|5[2569]|7[06-9]|8[1-9]|9[0-9])\d{7}$",
            RegexOptions.Compiled
        );

        public static bool IsValidVietnamesePhone(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return false;
            return VnPhoneRegex.IsMatch(phone.Trim());
        }

        public static string Normalize(string phone) => phone.Trim();
    }
}
