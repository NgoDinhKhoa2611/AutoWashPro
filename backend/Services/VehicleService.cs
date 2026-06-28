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
                    VehicleId = v.VehicleId,
                    CustomerId = v.CustomerId,
                    LicensePlate = v.LicensePlate,
                    Brand = v.Brand,
                    Model = v.Model,
                    VehicleClass = v.VehicleClass,
                    RegisteredAt = v.RegisteredAt,
                    HasActiveBooking = _context.Bookings.Any(b => b.VehicleId == v.VehicleId 
                        && b.Status != BookingStatus.Completed 
                        && b.Status != BookingStatus.Cancelled 
                        && b.Status != BookingStatus.NoShow)
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

            return await _otpService.GenerateAndSaveOtpAsync(email, "AddVehicle", normPlate);
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

            return await _otpService.VerifyOtpAsync(email, code, "AddVehicle", normPlate);
        }

        public async Task SaveVehicleAsync(int customerId, string licensePlate, string brand, string model, string vehicleClass)
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
            
            // Check duplicate after normalization
            bool exists = await IsPlateRegisteredAsync(normPlate);
            if (exists)
            {
                throw new InvalidOperationException("Biển số xe này đã được đăng ký trên hệ thống!");
            }
            
            var vehicle = new Vehicle
            {
                CustomerId = customerId,
                LicensePlate = normPlate,
                Brand = brand.Trim(),
                Model = model.Trim(),
                VehicleClass = vehicleClass.Trim()
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();
        }

        public async Task<(bool success, string message)> UpdateVehicleAsync(int customerId, int vehicleId, string brand, string model, string vehicleClass)
        {
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.CustomerId == customerId && v.VehicleId == vehicleId);

            if (vehicle == null)
            {
                return (false, "Không tìm thấy phương tiện tương ứng của bạn!");
            }

            if (string.IsNullOrWhiteSpace(brand) || string.IsNullOrWhiteSpace(model) || string.IsNullOrWhiteSpace(vehicleClass))
            {
                return (false, "Vui lòng nhập đầy đủ thông tin phương tiện.");
            }

            vehicle.Brand = brand.Trim();
            vehicle.Model = model.Trim();
            vehicle.VehicleClass = vehicleClass.Trim();

            await _context.SaveChangesAsync();
            return (true, "Cập nhật phương tiện thành công!");
        }

        public async Task<(bool success, string message)> DeleteVehicleByIdAsync(int customerId, int vehicleId)
        {
            var vehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.CustomerId == customerId && v.VehicleId == vehicleId);

            if (vehicle == null)
            {
                return (false, "Không tìm thấy phương tiện tương ứng của bạn!");
            }

            // Check if vehicle has active bookings
            var hasActiveBookings = await _context.Bookings.AnyAsync(b => b.VehicleId == vehicleId 
                && b.Status != BookingStatus.Completed 
                && b.Status != BookingStatus.Cancelled);
            if (hasActiveBookings)
            {
                return (false, "Không thể xóa phương tiện đã có lịch đặt lịch đang chờ xử lý.");
            }

            _context.Vehicles.Remove(vehicle);
            await _context.SaveChangesAsync();
            return (true, "Xoá phương tiện thành công!");
        }
    }
}
