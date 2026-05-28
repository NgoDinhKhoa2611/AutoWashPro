using Microsoft.AspNetCore.Mvc;

namespace Auto_Wash.Controllers
{
    public class AccountController : Controller
    {
        public IActionResult Login()
        {
            ViewBag.PageTitle = "Đăng nhập";
            return View();
        }
    }
}
