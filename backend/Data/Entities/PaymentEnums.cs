namespace Auto_Wash.Data.Entities
{
    public enum PaymentStatus
    {
        Pending = 1,
        Paid = 2,
        Failed = 3,
        Expired = 4
    }

    public enum PaymentMethod
    {
        Cash = 1,
        VNPay = 2,
        PayOS = 3
    }
}
