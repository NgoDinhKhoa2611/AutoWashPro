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
                QueueStatus.LPR_Scan => "Đã quét LPR",
                QueueStatus.Washing => "Đang rửa bọt tuyết",
                QueueStatus.Addon_Processing => "Đang xử lý dịch vụ đi kèm",
                QueueStatus.Drying => "Đang sấy khô / kiểm tra cuối",
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
