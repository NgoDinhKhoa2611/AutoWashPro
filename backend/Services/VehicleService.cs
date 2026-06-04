using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Auto_Wash.Data;
using Auto_Wash.Data.Entities;
using Auto_Wash.Helpers;
using Auto_Wash.DTOs.Vehicle;

namespace Auto_Wash.Services
{
    public class VehicleService
    {
        private readonly AutoWashDbContext _context;
        private readonly OtpService _otpService;

        public VehicleService(AutoWashDbContext context, OtpService otpService)
        {
            _context = context;
            _otpService = otpService;
        }

        public async Task<List<VehicleDto>> GetCustomerVehiclesAsync(int customerId)
        {
            return await _context.Vehicles
                .Where(v => v.CustomerId == customerId)
                .Select(v => new VehicleDto
                {
                    Plate = v.LicensePlate,
                    Type = v.Name ?? v.Brand ?? "Chưa cập nhật"
                })
                .ToListAsync();
        }

        public async Task<bool> IsPlateRegisteredAsync(string licensePlate)
        {
            string norm = LicensePlateHelper.Normalize(licensePlate);
            return await _context.Vehicles
                .AnyAsync(v => v.LicensePlate == norm);
        }

        public async Task<string> SendVehicleOtpAsync(string email, string licensePlate)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (string.IsNullOrWhiteSpace(normPlate))
            {
                throw new ArgumentException("Biển số xe không được để trống!");
            }
            if (normPlate.Length > 10)
            {
                throw new ArgumentException("Biển số xe quá dài (tối đa 10 ký tự sau khi chuẩn hóa)!");
            }

            // TODO: Vehicle OTP currently stores normalized license plate in Phone field to avoid schema change in this phase.
            // Production should add Purpose + LicensePlate columns to OtpVerification.
            return await _otpService.GenerateAndSaveOtpAsync(email, normPlate);
        }

        public async Task<bool> VerifyVehicleOtpAsync(string email, string code, string licensePlate)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (string.IsNullOrWhiteSpace(normPlate))
            {
                return false;
            }
            if (normPlate.Length > 10)
            {
                return false;
            }

            // TODO: Vehicle OTP currently stores normalized license plate in Phone field to avoid schema change in this phase.
            // Production should add Purpose + LicensePlate columns to OtpVerification.
            var otp = await _context.OtpVerifications
                .Where(o => o.Email == email.Trim() && o.Code == code.Trim() && o.Phone == normPlate && !o.IsUsed && o.ExpiresAt > DateTime.Now)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (otp == null) return false;

            otp.IsUsed = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task SaveVehicleAsync(int customerId, string licensePlate, string? type)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            if (string.IsNullOrWhiteSpace(normPlate))
            {
                throw new ArgumentException("Biển số xe không được để trống!");
            }
            if (normPlate.Length > 20)
            {
                throw new ArgumentException("Biển số xe quá dài (tối đa 20 ký tự sau khi chuẩn hóa)!");
            }
            
            // Check duplicate after normalization
            bool exists = await IsPlateRegisteredAsync(normPlate);
            if (exists)
            {
                throw new InvalidOperationException("Biển số xe này đã được đăng ký trên hệ thống!");
            }

            var brandType = string.IsNullOrWhiteSpace(type) ? "Chưa cập nhật" : type.Trim();
            
            var vehicle = new Vehicle
            {
                CustomerId = customerId,
                LicensePlate = normPlate,
                Brand = brandType,
                Name = brandType,
                RegisteredAt = DateTime.Now
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();
        }

        public async Task<(bool success, string message)> DeleteVehicleAsync(int customerId, string licensePlate)
        {
            string normPlate = LicensePlateHelper.Normalize(licensePlate);
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.CustomerId == customerId && v.LicensePlate == normPlate);

            if (vehicle == null)
            {
                return (false, "Không tìm thấy phương tiện tương ứng của bạn!");
            }

            // Check if vehicle has bookings
            var hasBookings = await _context.Bookings.AnyAsync(b => b.VehicleId == vehicle.VehicleId);
            if (hasBookings)
            {
                return (false, "Không thể xóa phương tiện đã có lịch sử đặt lịch.");
            }

            _context.Vehicles.Remove(vehicle);
            await _context.SaveChangesAsync();
            return (true, "Xoá phương tiện thành công!");
        }
    }
}
