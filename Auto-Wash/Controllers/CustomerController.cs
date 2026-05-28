using Microsoft.AspNetCore.Mvc;

namespace Auto_Wash.Controllers
{
    public class CustomerController : Controller
    {
        public IActionResult Dashboard()
        {
            ViewBag.PageTitle  = "Dashboard";
            ViewBag.ActiveNav  = "dashboard";
            ViewBag.UserName   = "Khách hàng";
            ViewBag.UserTier   = "Gold Member";
            ViewBag.UserPoints = "1250";
            ViewBag.UserAvatar = "";
            return View();
        }

        public IActionResult Booking()
        {
            ViewBag.PageTitle = "Đặt lịch rửa xe";
            ViewBag.ActiveNav = "booking";
            ViewBag.UserName  = "Khách hàng";
            ViewBag.UserTier  = "Gold Member";
            ViewBag.UserPoints = "1250";
            ViewBag.UserAvatar = "";
            return View();
        }

        public IActionResult Loyalty()
        {
            ViewBag.PageTitle = "Tích điểm & Ưu đãi";
            ViewBag.ActiveNav = "loyalty";
            ViewBag.UserName  = "Khách hàng";
            ViewBag.UserTier  = "Gold Member";
            ViewBag.UserPoints = "1250";
            ViewBag.UserAvatar = "";
            return View();
        }

        public IActionResult History()
        {
            ViewBag.PageTitle = "Lịch sử rửa xe";
            ViewBag.ActiveNav = "history";
            ViewBag.UserName  = "Khách hàng";
            ViewBag.UserTier  = "Gold Member";
            ViewBag.UserPoints = "1250";
            ViewBag.UserAvatar = "";
            return View();
        }

        public IActionResult Profile()
        {
            ViewBag.PageTitle = "Hồ sơ của tôi";
            ViewBag.ActiveNav = "profile";
            ViewBag.UserName  = "Khách hàng";
            ViewBag.UserTier  = "Gold Member";
            ViewBag.UserPoints = "1250";
            ViewBag.UserAvatar = "";
            return View();
        }
    }
}
