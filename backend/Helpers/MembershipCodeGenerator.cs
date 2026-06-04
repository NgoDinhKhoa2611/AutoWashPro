using System;

namespace Auto_Wash.Helpers
{
    public static class MembershipCodeGenerator
    {
        public static string Generate()
        {
            return "MEM" + DateTime.Now.ToString("yyMMddHHmmss");
        }
    }
}
