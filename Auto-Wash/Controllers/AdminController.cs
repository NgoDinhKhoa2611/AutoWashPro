using Microsoft.AspNetCore.Mvc;

namespace Auto_Wash.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Dashboard()
        {
            ViewBag.PageTitle = "Admin Dashboard";
            ViewBag.ActiveNav = "dashboard";
            return View();
        }

        public IActionResult Queue()
        {
            ViewBag.PageTitle = "Hàng đợi rửa xe";
            ViewBag.ActiveNav = "queue";
            return View();
        }

        public IActionResult Customers()
        {
            ViewBag.PageTitle = "Quản lý khách hàng";
            ViewBag.ActiveNav = "customers";
            return View();
        }

        public IActionResult Services()
        {
            ViewBag.PageTitle = "Quản lý dịch vụ";
            ViewBag.ActiveNav = "services";
            return View();
        }

        public IActionResult Promotions()
        {
            ViewBag.PageTitle = "Khuyến mãi & Chiến dịch";
            ViewBag.ActiveNav = "promotions";
            return View();
        }
    }
}
