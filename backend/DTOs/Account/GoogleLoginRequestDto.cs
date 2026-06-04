namespace Auto_Wash.DTOs.Account
{
    public class GoogleLoginRequestDto
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string GoogleId { get; set; } = string.Empty;
    }
}
