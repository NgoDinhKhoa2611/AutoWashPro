using System;
using System.Collections.Generic;
using Auto_Wash.Data.Entities;
using Auto_Wash.DTOs;

namespace Auto_Wash.Helpers
{
    public static class BookingWorkflowConfig
    {
        // DEMO VALUE - CHANGE BACK TO MINUTES BEFORE FINAL RELEASE
        public const int CheckInSeconds = 10;
        public const int WashingSeconds = 15;
        public const int DryingSeconds = 15;
        public const int FinalInspectionSeconds = 10;
        public const int TotalDurationSeconds = 50;

        private static readonly (string Key, string Name)[] OfficialStages = new[]
        {
            ("CheckIn", "Check-in"),
            ("Washing", "Rửa xe"),
            ("Drying", "Sấy khô"),
            ("FinalInspection", "Kiểm tra cuối"),
            ("Completed", "Hoàn tất"),
            ("Checkout", "Đã giao xe")
        };

        public static string GetCurrentStage(double elapsedSeconds)
        {
            if (elapsedSeconds < CheckInSeconds)
                return "CheckIn";
            if (elapsedSeconds < CheckInSeconds + WashingSeconds)
                return "Washing";
            if (elapsedSeconds < CheckInSeconds + WashingSeconds + DryingSeconds)
                return "Drying";
            if (elapsedSeconds < TotalDurationSeconds)
                return "FinalInspection";
            return "Completed";
        }

        public static int GetStageProgress(string stage)
        {
            return stage switch
            {
                "CheckIn" => 15,
                "Washing" => 35,
                "Drying" => 55,
                "FinalInspection" => 75,
                "Completed" => 90,
                "Checkout" => 100,
                _ => 0
            };
        }

        public static BookingProgressDto GetProgressForBooking(Booking? booking, Queue? queue)
        {
            var dto = new BookingProgressDto();

            if (booking != null && booking.CheckedOutAt != null)
            {
                dto.CurrentStage = "Checkout";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
            }
            else if (queue != null && queue.Status == QueueStatus.Archived)
            {
                dto.CurrentStage = "Checkout";
                dto.Progress = 100;
                dto.RemainingSeconds = 0;
            }
            else if (booking != null && booking.Status == BookingStatus.Completed)
            {
                dto.CurrentStage = "Completed";
                dto.Progress = 90;
                dto.RemainingSeconds = 0;
            }
            else if (booking != null && (booking.Status == BookingStatus.Cancelled || booking.Status == BookingStatus.NoShow))
            {
                dto.CurrentStage = booking.Status == BookingStatus.NoShow ? "NoShow" : "Cancelled";
                dto.Progress = 0;
                dto.RemainingSeconds = 0;

                if (booking.Status == BookingStatus.NoShow)
                {
                    dto.Stages.Add(new ProgressStageItemDto
                    {
                        StageKey = "NoShow",
                        DisplayName = "Khách không đến (Không phát sinh quy trình xử lý)",
                        IsCompleted = false,
                        IsActive = true
                    });
                }
                else
                {
                    dto.Stages.Add(new ProgressStageItemDto
                    {
                        StageKey = "Cancelled",
                        DisplayName = "Đã hủy lịch hẹn (Không phát sinh quy trình xử lý)",
                        IsCompleted = false,
                        IsActive = true
                    });
                }
                return dto;
            }
            else if (queue != null && queue.Status != QueueStatus.Cancelled && queue.Status != QueueStatus.Archived && queue.Status != QueueStatus.Completed)
            {
                var elapsed = (DateTime.Now - queue.CheckInAt).TotalSeconds;
                if (elapsed < 0) elapsed = 0;

                dto.CurrentStage = queue.CurrentStage ?? GetCurrentStage(elapsed);
                dto.Progress = GetStageProgress(dto.CurrentStage);
                dto.RemainingSeconds = (int)Math.Max(0, TotalDurationSeconds - elapsed);
            }
            else if (queue != null && queue.Status == QueueStatus.Completed)
            {
                dto.CurrentStage = "Completed";
                dto.Progress = 90;
                dto.RemainingSeconds = 0;
            }
            else
            {
                // Awaiting check-in
                dto.CurrentStage = "CheckIn";
                dto.Progress = 0;
                dto.RemainingSeconds = TotalDurationSeconds;
            }

            // Populate stages checklist dynamically
            int activeIndex = -1;
            if (dto.CurrentStage == "Checkout")
            {
                activeIndex = OfficialStages.Length;
            }
            else if (dto.CurrentStage == "Completed")
            {
                activeIndex = OfficialStages.Length - 1;
            }
            else
            {
                for (int i = 0; i < OfficialStages.Length; i++)
                {
                    if (OfficialStages[i].Key == dto.CurrentStage)
                    {
                        activeIndex = i;
                        break;
                    }
                }
            }

            // For pending/confirmed booking that is not checked in yet, progress is 0, nothing active
            if (queue == null && booking != null && booking.Status != BookingStatus.CheckedIn && booking.Status != BookingStatus.Completed && booking.Status != BookingStatus.Washing)
            {
                activeIndex = -1;
            }

            for (int i = 0; i < OfficialStages.Length; i++)
            {
                var stageKey = OfficialStages[i].Key;
                dto.Stages.Add(new ProgressStageItemDto
                {
                    StageKey = stageKey,
                    DisplayName = OfficialStages[i].Name,
                    IsCompleted = activeIndex != -1 && i < activeIndex,
                    IsActive = activeIndex != -1 && i == activeIndex
                });
            }

            return dto;
        }
    }
}
