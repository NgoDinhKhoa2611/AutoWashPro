namespace Auto_Wash.Data.Entities
{
    public enum QueueStatus
    {
        Waiting,
        LPR_Scan,
        Washing,
        Addon_Processing,
        Drying,
        Completed,
        Cancelled,
        Archived
    }
}
