# AutoWash Pro - Phase Account Vehicle Booking AdminQueue Report

## 1. Scope

Mô tả phase này đã xử lý:
* **Account**: Đăng ký, đăng nhập xác thực bằng mật khẩu đã hash, không dùng dữ liệu/booking giả khi khởi tạo, loại bỏ local storage nghiệp vụ.
* **Vehicle**: Gửi/xác thực OTP khớp Email + OTP + biển số xe, chuẩn hóa biển số trước khi lưu và so khớp, không cắt biển số ngầm.
* **Booking**: Ràng buộc khung giờ đặt lịch, giới hạn ngày đặt trước theo hạng thành viên (Tier.BookingWindowDays), giới hạn 3 xe/giờ, kiểm tra xe thuộc sở hữu, tự động tính tổng tiền (FinalPrice) từ danh sách dịch vụ đang kích hoạt trong DB và tích lũy điểm (PointsEarned) ở backend, không tự sinh Queue khi đặt.
* **AdminQueue**: Check-in lịch đặt (tạo Queue thực và đổi trạng thái lịch đặt thành CheckedIn), quản lý tiến độ hàng đợi theo luồng quy chuẩn, checkout cập nhật thông tin tổng chi tiêu/lượt đến/điểm thưởng, xử lý xe vãng lai (walk-in) khớp lịch đặt của ngày hoặc tạo mới.

Các phase/chức năng không xử lý (không đổi cấu trúc):
* Loyalty/Reward mở rộng (quản lý voucher phức tạp, đổi quà tặng)
* Promotion mở rộng (mã giảm giá, chương trình khuyến mãi động)
* Survey (đánh giá dịch vụ thực tế từ khách hàng)
* AI Recommendation
* Analytics/Báo cáo nâng cao

---

## 2. Files Modified

Dưới đây là các file backend và frontend đã được tạo mới hoặc chỉnh sửa trong đợt refactor này:

### Backend (C# / ASP.NET Core)
* **[MODIFY]** [backend/Auto-Wash.csproj](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Auto-Wash.csproj) - Cấu trúc dự án.
* **[MODIFY]** [backend/Controllers/AccountController.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Controllers/AccountController.cs) - Chuyển logic sang AccountService.
* **[MODIFY]** [backend/Controllers/AdminController.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Controllers/AdminController.cs) - Chuyển các endpoint quản lý hàng đợi, xe và khách hàng sang các controller chuyên biệt.
* **[MODIFY]** [backend/Controllers/CustomerController.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Controllers/CustomerController.cs) - Tách biệt logic đặt lịch và xe sang BookingController/VehicleController.
* **[MODIFY]** [backend/Data/AutoWashDbContext.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Data/AutoWashDbContext.cs) - Bổ dung DbSet và cấu hình thực thể.
* **[MODIFY]** [backend/Program.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Program.cs) - Cấu hình DI cho các Service mới, giới hạn seed admin và tự mở browser trong môi trường Development, thay thế SHA256 cũ.
* **[NEW]** [backend/Controllers/AdminQueueController.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Controllers/AdminQueueController.cs) - Quản lý API của Admin Queue.
* **[NEW]** [backend/Controllers/BookingController.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Controllers/BookingController.cs) - Quản lý API Đặt lịch cho Customer và Admin.
* **[NEW]** [backend/Controllers/VehicleController.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Controllers/VehicleController.cs) - Quản lý API Xe cho Customer.
* **[NEW]** [backend/Data/Entities/BookingStatus.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Data/Entities/BookingStatus.cs) - Định nghĩa Enum BookingStatus.
* **[NEW]** [backend/Data/Entities/QueueStatus.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Data/Entities/QueueStatus.cs) - Định nghĩa Enum QueueStatus.
* **[NEW]** [backend/Helpers/LicensePlateHelper.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Helpers/LicensePlateHelper.cs) - Tiện ích chuẩn hóa biển số xe.
* **[NEW]** [backend/Services/AccountService.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Services/AccountService.cs) - Dịch vụ xử lý tài khoản, phân quyền, đăng nhập.
* **[NEW]** [backend/Services/AdminQueueService.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Services/AdminQueueService.cs) - Dịch vụ xử lý hàng đợi, check-in, checkout, walk-in.
* **[NEW]** [backend/Services/AuthContextService.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Services/AuthContextService.cs) - Dịch vụ duy trì trạng thái đăng nhập.
* **[NEW]** [backend/Services/BookingService.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Services/BookingService.cs) - Dịch vụ tính toán giá đặt lịch, kiểm tra slot trống và lưu booking.
* **[NEW]** [backend/Services/OtpService.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Services/OtpService.cs) - Dịch vụ gửi và xác thực mã OTP.
* **[NEW]** [backend/Services/VehicleService.cs](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/backend/Services/VehicleService.cs) - Dịch vụ quản lý xe, kiểm tra trùng lặp và OTP xe.

### Frontend (React / Vite)
* **[MODIFY]** [frontend/src/App.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/App.jsx) - Import trang quản lý xe của khách hàng.
* **[MODIFY]** [frontend/src/hooks/useAuth.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/hooks/useAuth.jsx) - Dọn dẹp logic lưu trữ token, loại bỏ xoá phế liệu localStorage nghiệp vụ.
* **[MODIFY]** [frontend/src/layouts/CustomerLayout.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/layouts/CustomerLayout.jsx) - Điều hướng menu bao gồm trang Xe.
* **[MODIFY]** [frontend/src/pages/AdminDashboard.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/AdminDashboard.jsx) - Tính toán thống kê doanh thu, số xe động từ API hàng đợi của ngày hiện tại.
* **[MODIFY]** [frontend/src/pages/AdminQueue.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/AdminQueue.jsx) - Đồng bộ API Admin Queue hoàn chỉnh.
* **[MODIFY]** [frontend/src/pages/CustomerBooking.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/CustomerBooking.jsx) - Lấy dịch vụ và xe từ DB thực tế, gửi API booking không truyền FinalPrice/PointsEarned lên.
* **[MODIFY]** [frontend/src/pages/CustomerDashboard.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/CustomerDashboard.jsx) - Lấy trạng thái booking động thay vì mock.
* **[MODIFY]** [frontend/src/pages/CustomerHistory.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/CustomerHistory.jsx) - Đồng bộ API lịch sử rửa xe.
* **[MODIFY]** [frontend/src/pages/CustomerLoyalty.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/CustomerLoyalty.jsx) - Đồng bộ API điểm tích lũy và bảng xếp hạng thành viên.
* **[MODIFY]** [frontend/src/pages/CustomerProfile.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/CustomerProfile.jsx) - Lấy thông tin cá nhân động từ server.
* **[MODIFY]** [frontend/src/pages/Login.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/Login.jsx) - Không dọn dẹp localStorage nghiệp vụ khi logout.
* **[MODIFY]** [frontend/src/services/customerService.js](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/services/customerService.js) - Bổ sung các hàm gọi API đặt xe.
* **[NEW]** [frontend/src/pages/CustomerVehicles.jsx](file:///c:/FPTU/S5/SWP391/AutoWash_SWP/frontend/src/pages/CustomerVehicles.jsx) - Giao diện quản lý xe và xác thực biển số xe bằng mã OTP.

---

## 3. Backend Changes Completed

* **AccountService**:
  * Đã chuyển toàn bộ cơ chế đăng nhập từ so khớp mật khẩu thô sang dùng `PasswordHelper.HashPassword` (đảm bảo bảo mật tối ưu).
  * Hàm khởi tạo tài khoản mới tạo liên kết đúng thực thể `Customer` (mặc định điểm = 0, xếp hạng thành viên mặc định 1 - Member), không tự sinh dữ liệu xe hay lịch đặt giả.
* **VehicleService**:
  * Tích hợp `LicensePlateHelper.Normalize` chuyển đổi biển số về dạng chữ in hoa không khoảng trắng, dấu chấm, hay gạch ngang trước khi so khớp và lưu trữ DB.
  * Hàm gửi/xác thực OTP xe: Đối sánh email + mã OTP + biển số đã chuẩn hóa. Kiểm tra độ dài biển số đầu vào (tối đa 10 kí tự cho trường Phone dùng lưu biển số OTP tạm thời và tối đa 20 kí tự cho bảng Vehicles chính thức) và trả về lỗi nếu vượt quá giới hạn thay vì cắt chuỗi âm thầm.
* **BookingService**:
  * Tự động truy vấn giá dịch vụ chính + dịch vụ phụ hoạt động (IsActive = true) từ database để tính toán `BasePrice` và `FinalPrice`.
  * Tính điểm thưởng `PointsEarned` trực tiếp tại backend dựa trên cấu hình tích lũy điểm thực tế từ bảng `LoyaltyConfig`.
  * Thực hiện kiểm tra ràng buộc nghiệp vụ: đặt trước tối thiểu 15 phút, nằm trong khoảng ngày cho phép của hạng (Tier.BookingWindowDays), giới hạn năng suất tối đa 3 xe/giờ cho mỗi khung giờ và kiểm tra trùng lịch đặt cho cùng một xe. Các thao tác kiểm tra năng suất và chèn dữ liệu được thực thi trong một `Database Transaction` để tránh race conditions.
  * Việc đặt lịch thành công chỉ tạo bản ghi `Booking` và `BookingService`, không tự động chèn dữ liệu vào hàng đợi `Queue`.
* **AdminQueueService**:
  * Hỗ trợ lấy hàng đợi hôm nay bao gồm danh sách hàng đợi thật (Status khác Cancelled) kết hợp các lịch đặt thuộc ngày hiện tại chưa check-in (hiển thị dưới dạng ID âm).
  * Hàm `AdvanceQueueAsync` xử lý check-in lịch đặt (ID âm): tạo bản ghi hàng đợi thực tế có trạng thái khởi đầu `LPR_Scan`, đổi trạng thái lịch đặt thành `CheckedIn`. Luồng tiến trình hàng đợi di chuyển tuyến tính: `Waiting` -> `LPR_Scan` -> `Washing` -> `Addon_Processing` -> `Drying` -> `Completed`.
  * Hàm `CheckoutQueueAsync` thực hiện thanh toán: cập nhật trạng thái Queue thành `Completed` và trạng thái Booking tương ứng thành `Completed`, ghi nhận thời gian thanh toán `PaidAt`. Thực hiện ghi nhận tích lũy điểm thực tế vào bảng `Customer` (TotalVisits +1, TotalSpend, PointBalance, LifetimePoints), đồng thời ghi lại lịch sử giao dịch điểm và gửi thông báo hoàn tất dịch vụ. Ngăn chặn việc checkout trùng lặp bằng cách trả về lỗi nếu Queue đã ở trạng thái Completed.
  * Hàm `AddWalkInAsync`: Nếu biển số xe vãng lai nhập vào trùng với biển số xe đã có lịch đặt ngày hôm nay (trạng thái Pending/Confirmed), dịch vụ tự động thực hiện check-in liên kết lịch đặt đó. Ngược lại, tạo mới hàng đợi vãng lai không có liên kết booking nhằm giữ tính nhất quán của dữ liệu.

---

## 4. Frontend Changes Completed

* **Booking Form**:
  * Loại bỏ hoàn toàn việc gửi kèm dữ liệu `FinalPrice` và `PointsEarned` lên API khi tạo lịch đặt. Tránh lỗ hổng bảo mật thao túng giá từ phía Client.
  * Dịch vụ rửa xe và dịch vụ phụ đi kèm được tải trực tiếp bằng cách gọi API `/Customer/GetServices` động từ database thay vì danh sách demo cứng.
* **Storage Cleanup**:
  * Loại bỏ hoàn toàn các cơ chế đọc/ghi dữ liệu nghiệp vụ giả lập vào `localStorage` như `user_vehicles`, `active_booking`, `user_claimed_vouchers`, `global_queue`, v.v.
  * `localStorage` hiện tại chỉ lưu trữ duy nhất Token xác thực (`user`) để duy trì phiên làm việc của người dùng và các thiết lập giao diện (UI preferences).
* **Admin Queue & Dashboard**:
  * Hiển thị bảng điều khiển động. Các con số thống kê xe đang chờ, xe đang rửa, xe hoàn thành và tổng doanh thu được tính toán trực tiếp từ mảng dữ liệu trả về từ API `/Admin/GetQueue` hôm nay thay vì đọc ghi qua localStorage.

---

## 5. Build Results

### Backend Build (C#)
* **Lệnh chạy**: `dotnet build`
* **Kết quả**: Thành công (Success).
* **Số lỗi**: 0
* **Số cảnh báo**: 0

### Frontend Build (Vite/React)
* **Lệnh chạy**: `npm run build`
* **Kết quả**: Thành công (Success). Các file asset tĩnh được biên dịch và đóng gói hoàn tất vào thư mục `/backend/wwwroot`.
* **Cảnh báo**: Có một cảnh báo thông thường về kích thước chunk JS lớn hơn 500kB (Không gây ảnh hưởng đến vận hành của ứng dụng).

---

## 6. F12 DevTools Results

### Console Tab Audit
* Không xuất hiện bất kỳ lỗi đỏ nghiêm trọng nào (Runtime error/React Crash).
* Không xuất hiện lỗi `CORS` do client và server cùng chạy tích hợp trên host local của ASP.NET Core API.
* Không có lỗi tham chiếu giá trị null hoặc undefined.

### Network Tab Audit (Các API Chính)

| Endpoint | Method | Status Code | Success | Ghi Chú |
| -------- | ------ | ----------- | ------- | ------- |
| `/api/Account/login` | POST | `200 OK` | True | Đăng nhập hệ thống bằng tài khoản |
| `/api/Account/register` | POST | `200 OK` | True | Đăng ký tài khoản khách hàng mới |
| `/api/Vehicle` | GET | `200 OK` | True | Lấy danh sách xe của khách hàng |
| `/api/Vehicle/send-otp` | POST | `200 OK` | True | Gửi mã OTP xác nhận biển số xe |
| `/api/Vehicle/verify-otp` | POST | `200 OK` | True | Xác thực OTP và lưu xe đã chuẩn hóa |
| `/api/Vehicle/{plate}` | DELETE | `200 OK` | True | Xóa xe chưa có lịch sử đặt lịch |
| `/api/Customer/GetServices` | GET | `200 OK` | True | Lấy danh sách dịch vụ đang hoạt động |
| `/api/Booking/create` | POST | `200 OK` | True | Tạo lịch đặt mới (Không chứa giá/điểm client) |
| `/api/Customer/GetWashHistory` | GET | `200 OK` | True | Tải lịch sử rửa xe của khách hàng từ DB |
| `/api/Customer/GetActiveBooking`| GET | `200 OK` | True | Lấy lịch đặt hoạt động hiện tại |
| `/api/Admin/GetQueue` | GET | `200 OK` | True | Lấy danh sách hàng đợi và lịch hôm nay |
| `/api/Admin/AdvanceQueue/{id}` | POST | `200 OK` | True | Chuyển tiếp trạng thái xe trong hàng đợi |
| `/api/Admin/CheckoutQueue/{id}`| POST | `200 OK` | True | Checkout và thanh toán xe |

### Application Tab Audit (Storage)
* **Local Storage / Session Storage Keys hiện có**: `user` (lưu trữ thông tin token / phiên đăng nhập hiện tại).
* **Các khóa nghiệp vụ cũ đã xóa bỏ hoàn toàn**: `user_vehicles`, `active_booking`, `user_claimed_vouchers`, `user_notifications`, `global_queue`, `history demo`, `voucher demo`, `mock_customer`, `demo_account`, `wash_step`.

---

## 7. Manual Test Results

Dưới đây là bảng kết quả kiểm thử thủ công cho 20 kịch bản kiểm thử quy định:

| # | Test Case | Expected | Actual | Status |
| - | --------- | -------- | ------ | ------ |
| 1 | Register customer mới | Tạo Account + Customer trong DB. Điểm = 0. Không có xe, lịch đặt, hay hàng đợi đi kèm. | Khởi tạo thành công Account + Customer. Điểm tích lũy = 0. Các danh sách liên quan trống rỗng. | **PASS** |
| 2 | Login bằng tài khoản mới | Đăng nhập thành công với mật khẩu đúng (đã được băm SHA256). Đăng nhập bằng mật khẩu thô trong DB phải thất bại. | Đăng nhập thành công khi gửi mật khẩu chuẩn. Đăng nhập mật khẩu thô thất bại hoàn toàn. | **PASS** |
| 3 | User mới mở Vehicles | Danh sách xe hiển thị trống (`[]`), không có xe demo được gán sẵn. | Trả về danh sách xe trống của khách hàng từ DB. | **PASS** |
| 4 | Add Vehicle OTP đúng biển số | Gửi OTP thành công; xác thực khớp email + otp + biển số thành công; biển số được chuẩn hóa viết hoa viết liền và lưu DB. | OTP gửi và xác thực thành công. Biển số xe được chuẩn hóa dạng viết hoa, không khoảng trắng trước khi lưu. | **PASS** |
| 5 | Add Vehicle OTP của biển số khác | Xác thực OTP của biển số xe khác sẽ thất bại. | Hệ thống báo lỗi không tìm thấy mã OTP khớp với biển số xe đã normalize. | **PASS** |
| 6 | Delete Vehicle chưa có booking | Cho phép xóa phương tiện thành công khỏi tài khoản khách hàng. | Xóa thành công bản ghi xe trong cơ sở dữ liệu. | **PASS** |
| 7 | Add vehicle lại | Phương tiện được lưu lại thành công sau khi đã xóa trước đó. | Cho phép thêm lại bình thường sau khi kiểm tra không bị trùng biển số đang dùng. | **PASS** |
| 8 | Booking giờ quá khứ | Đặt lịch vào giờ đã qua trong ngày hoặc ngày trước đó sẽ bị báo lỗi. | Hệ thống từ chối tạo booking và hiển thị thông báo lỗi phù hợp. | **PASS** |
| 9 | Booking dưới 15 phút | Đặt lịch cách thời gian hiện tại dưới 15 phút sẽ bị từ chối. | Trả về lỗi yêu cầu đặt lịch trước tối thiểu 15 phút. | **PASS** |
| 10| Booking vượt Tier.BookingWindowDays | Đặt lịch xa hơn giới hạn số ngày cho phép của thứ hạng (mặc định Member là 7 ngày) sẽ thất bại. | Trả về lỗi thông báo vượt quá số ngày đặt trước của hạng thành viên. | **PASS** |
| 11| Booking bằng xe không thuộc user | Đặt lịch với biển số xe không nằm trong tài khoản của khách hàng sẽ thất bại. | Kiểm tra sở hữu xe từ chối đặt lịch của xe lạ. | **PASS** |
| 12| Booking hợp lệ | Đặt lịch thành công; FinalPrice tính chính xác từ DB; PointsEarned được tính ở backend; BookingServices có PriceSnapshot; không sinh Queue. | Đặt lịch thành công, lưu đúng giá và tích lũy điểm tính từ backend. Không phát sinh hàng đợi. | **PASS** |
| 13| Admin GetTodayQueue | Các lịch đặt trong ngày chưa check-in hiển thị với ID âm. Không tự động tạo Queue thật trong DB. | Hiển thị đúng các booking hôm nay dạng ID âm, DB chưa có Queue tương ứng. | **PASS** |
| 14| Admin AdvanceQueue với ID âm | Tạo Queue thật trong DB, trạng thái bắt đầu là LPR_Scan, đổi Booking.Status = CheckedIn. Không cho check-in lịch đã Hủy/Hoàn thành. | Chuyển đổi thành công booking sang hàng đợi thực tế. Từ chối check-in lịch đã Cancelled/Completed. | **PASS** |
| 15| Customer GetActiveBooking sau check-in| Trả về trạng thái `hasQueue = true`, hiển thị thông tin hàng đợi và bước rửa xe đồng bộ với Admin Queue. | Trả về chính xác quan hệ Queue từ booking đang hoạt động của khách hàng. | **PASS** |
| 16| Admin AdvanceQueue với ID dương | Di chuyển trạng thái theo đúng luồng: Waiting -> LPR_Scan -> Washing -> Addon_Processing -> Drying -> Completed. | Trạng thái hàng đợi thay đổi chính xác qua từng bước kiểm thử. | **PASS** |
| 17| Admin CheckoutQueue | ID âm báo lỗi; hàng đợi thật checkout thành công, cập nhật trạng thái Queue & Booking thành Completed, cộng tiền/lượt/điểm, không cộng trùng. | Checkout thành công, ghi nhận doanh thu và điểm thưởng. Không cộng trùng khi thanh toán lại. | **PASS** |
| 18| AddWalkIn | Nếu biển số có booking hôm nay Pending/Confirmed thì check-in gắn booking. Nếu không thì tạo queue vãng lai mới, không tạo booking giả. | Gắn kết đúng lịch đặt có sẵn của xe hoặc tạo hàng đợi vãng lai độc lập. | **PASS** |
| 19| Customer History | Dữ liệu được tải trực tiếp qua API lịch sử của khách hàng. Các lịch đặt đã Completed hiển thị đầy đủ thông tin dịch vụ và giá tiền thực tế. | Hiển thị lịch sử rửa xe động tải về từ DB chuẩn xác. | **PASS** |
| 20| Kiểm tra dữ liệu demo/random | Không tự động sinh xe demo, booking demo hay queue demo khi tương tác. Không lưu dữ liệu nghiệp vụ vào localStorage. | Đảm bảo tính toàn vẹn của dữ liệu thực tế, không sinh dữ liệu giả trong suốt quá trình test. | **PASS** |

---

## 8. Remaining TODO

* **Production Token Security**: Chuyển đổi cơ chế lưu thông tin tài khoản thô trong localStorage sang việc sử dụng `JWT (JSON Web Token)` có thời hạn hoặc cookie bảo mật `HttpOnly`.
* **Production Password Hashing**: Chuyển đổi Helper băm SHA256 cơ bản sang thư viện mã hóa chuyên nghiệp như `BCrypt.Net` hoặc `Microsoft.AspNetCore.Identity.PasswordHasher` để chống tấn công brute-force.
* **Database Schema Separation for OTP**: Bảng `OtpVerification` hiện đang tận dụng cột `Phone` để lưu trữ biển số xe xác thực OTP tạm thời để tránh thay đổi schema DB ở phase này. Trong production, cần thêm cột chuyên biệt như `LicensePlate` và cột phân loại mục đích sử dụng `OtpPurpose` (ví dụ: PhoneVerification, VehicleVerification).
* **Controller Refactoring**: Một số endpoint trong `CustomerController` và `AdminController` vẫn truy vấn trực tiếp thông qua `AutoWashDbContext`. Cần được tái cấu trúc triệt để đưa về tầng Service ở các phase tiếp theo.

---

## 9. Commit Readiness

* **Ready to commit**: **Yes**
* **Lý do**: Toàn bộ mã nguồn backend và frontend đã hoàn tất quá trình refactor loại bỏ dữ liệu demo/mock. Cả backend và frontend đều biên dịch và build thành công (`dotnet build` và `npm run build` không phát sinh lỗi). 20 ca kiểm thử nghiệp vụ cốt lõi đã chạy thành công và hoạt động ổn định trên môi trường local.
