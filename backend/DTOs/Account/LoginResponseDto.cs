namespace Auto_Wash.DTOs.Account
{
    public class LoginResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Role { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Tier { get; set; }
        public int? Points { get; set; }
        public bool IsNewUser { get; set; }
    }
}
