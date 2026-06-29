using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Auto_Wash.Hubs
{
    /// <summary>
    /// Real-time channel for booking events. Staff/admin connections are placed in
    /// the "staff" group so server-side events (e.g. a newly created booking) can be
    /// pushed to the admin UI instead of being discovered by timer polling.
    ///
    /// Auth reuses the existing session cookie (no JWT): the role is read from the
    /// session that was populated at login (see AccountController). Customers that
    /// connect simply never join the staff group, so they receive no booking events.
    /// </summary>
    public class BookingHub : Hub
    {
        public const string StaffGroup = "staff";

        public override async Task OnConnectedAsync()
        {
            var http = Context.GetHttpContext();
            if (http != null)
            {
                // The session cookie rides along on the negotiate/handshake request;
                // make sure the session store is loaded before reading from it.
                try { await http.Session.LoadAsync(); } catch { /* already loaded */ }

                var role = http.Session.GetString("UserRole");
                if (role == "admin" || role == "staff")
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, StaffGroup);
                }
            }

            await base.OnConnectedAsync();
        }
    }
}
