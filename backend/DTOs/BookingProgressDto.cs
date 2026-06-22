using System.Collections.Generic;

namespace Auto_Wash.DTOs
{
    public class BookingProgressDto
    {
        public string CurrentStage { get; set; } = "CheckIn";
        public int Progress { get; set; } = 20;
        public int RemainingSeconds { get; set; } = 50;
        public List<ProgressStageItemDto> Stages { get; set; } = new();
    }
}
