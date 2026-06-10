using System;

namespace Auto_Wash.Helpers
{
    public static class MembershipCodeGenerator
    {
        // MEM + yyyyMMddHHmmssfff (15 ký tự) -> luôn duy nhất kể cả khi nhiều yêu cầu trong cùng giây
        public static string Generate()
        {
            return "MEM" + DateTime.UtcNow.ToString("yyMMddHHmmssfff");
        }
    }
}