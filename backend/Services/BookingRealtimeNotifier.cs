using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Auto_Wash.Hubs;

namespace Auto_Wash.Services
{
    /// <summary>
    /// Lightweight payload pushed to the admin UI when a booking is created.
    /// Carries just enough for a toast + targeted refresh — the client still
    /// re-fetches the authoritative list.
    /// </summary>
    public record BookingCreatedEvent(
        int BookingId,
        string LicensePlate,
        string CustomerName,
        DateTime ScheduledAt,
        decimal FinalPrice,
        string ServiceName,
        string Status);

    /// <summary>
    /// Payload pushed to staff/admin when a wash finishes so an employee can
    /// photograph the car and notify the customer by email.
    /// </summary>
    public record WashCompletedEvent(
        int QueueId,
        int? BookingId,
        string LicensePlate,
        string CustomerName);

    public interface IBookingRealtimeNotifier
    {
        Task NotifyBookingCreatedAsync(BookingCreatedEvent payload);
        Task NotifyWashCompletedAsync(WashCompletedEvent payload);
    }

    /// <summary>
    /// Pushes booking events to staff/admin clients over SignalR. Stateless wrapper
    /// around the (singleton) hub context, so it is safe to register as a singleton.
    /// </summary>
    public class BookingRealtimeNotifier : IBookingRealtimeNotifier
    {
        private readonly IHubContext<BookingHub> _hub;

        public BookingRealtimeNotifier(IHubContext<BookingHub> hub)
        {
            _hub = hub;
        }

        public Task NotifyBookingCreatedAsync(BookingCreatedEvent payload)
        {
            return _hub.Clients.Group(BookingHub.StaffGroup).SendAsync("BookingCreated", payload);
        }

        public Task NotifyWashCompletedAsync(WashCompletedEvent payload)
        {
            return _hub.Clients.Group(BookingHub.StaffGroup).SendAsync("WashCompleted", payload);
        }
    }
}
