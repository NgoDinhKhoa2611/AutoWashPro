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
                QueueStatus.Washing => "Đang rửa xe",
                QueueStatus.Drying => "Đang sấy khô",
                QueueStatus.Completed => "Hoàn tất",
                QueueStatus.Archived => "Đã giao xe",
                QueueStatus.Cancelled => "Đã hủy",
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
