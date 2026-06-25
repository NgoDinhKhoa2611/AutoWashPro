namespace Auto_Wash.DTOs
{
    public class ProgressStageItemDto
    {
        public string StageKey { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public bool IsCompleted { get; set; }
        public bool IsActive { get; set; }
    }
}
