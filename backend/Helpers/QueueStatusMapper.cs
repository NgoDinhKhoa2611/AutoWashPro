using Auto_Wash.Data.Entities;

namespace Auto_Wash.Helpers
{
    public static class QueueStatusMapper
    {
        public static string GetCustomerLabel(QueueStatus status)
        {
            return status switch
            {
                QueueStatus.Waiting => "Chờ check-in",
                QueueStatus.LPR_Scan => "Check-in",
                QueueStatus.Washing => "Rửa ngoại thất",
                QueueStatus.Addon_Processing => "Vệ sinh nội thất",
                QueueStatus.Drying => "Kiểm tra cuối",
                QueueStatus.Completed => "Hoàn tất",
                _ => "Chờ check-in"
            };
        }

        public static string GetCustomerLabel(string? statusStr)
        {
            if (string.IsNullOrEmpty(statusStr)) return "Chờ check-in";
            if (System.Enum.TryParse<QueueStatus>(statusStr, true, out var status))
            {
                return GetCustomerLabel(status);
            }
            return statusStr;
        }
    }
}
