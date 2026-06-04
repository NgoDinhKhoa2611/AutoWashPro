# AutoWash Pro Project Status Report

Báo cáo này cung cấp cái nhìn khách quan, chi tiết về hiện trạng mã nguồn, các chức năng đã hoàn tất, các phần còn dang dở/giả lập (mock), cấu trúc cơ sở dữ liệu, kiến trúc lập trình OOP, và các nợ kỹ thuật (technical debt) của dự án AutoWash Pro sau khi kết thúc Phase 1 (Account, Vehicle, Booking, Admin Queue).

---

## Completed Features

Dưới đây là danh sách chức năng đã được xây dựng hoàn thiện và kết nối đồng bộ giữa Backend (Database/API) và Frontend (UI):

### 1. Account (Tài khoản)
* **Đăng ký tài khoản mới** (✅ Completed): Tạo bản ghi tài khoản `Account` kèm thực thể `Customer` tương ứng trong DB. Điểm khởi tạo mặc định bằng 0, hạng thành viên mặc định là Standard.
* **Đăng nhập** (✅ Completed): Thực hiện xác thực thông qua API bằng mật khẩu băm SHA256.
* **Đăng xuất** (✅ Completed): Làm sạch cookie phiên làm việc tại server và token lưu trữ ở client.
* **Đăng nhập Google** (✅ Completed): Hoàn tất đăng ký liên kết tài khoản Google bằng API `CompleteGoogleSignupAsync`.
* **Quản lý phiên làm việc** (✅ Completed): Sử dụng cơ chế session lưu trữ trong bộ nhớ đệm phân tán (Distributed Memory Cache).
* **Thay đổi mật khẩu** (✅ Completed): Hỗ trợ đổi mật khẩu thông qua mã xác thực OTP gửi về Email hoặc xác nhận qua số điện thoại trực tiếp trên DB.
* **Cập nhật thông tin cá nhân** (⚠ Partial): Đã kết nối API lưu thông tin họ tên, số điện thoại vào DB nhưng controller vẫn truy vấn DB trực tiếp.

### 2. Vehicle (Phương tiện)
* **Thêm phương tiện mới** (✅ Completed): Sử dụng cơ chế gửi và xác thực mã OTP khớp email + biển số xe trước khi lưu.
* **Chuẩn hóa biển số** (✅ Completed): Tiện ích `LicensePlateHelper` tự động chuyển đổi biển số về dạng chữ in hoa không ký tự đặc biệt (khoảng trắng, chấm, gạch ngang) trước khi so khớp và lưu trữ.
* **Xác thực quyền sở hữu** (✅ Completed): Ràng buộc chặn khách hàng khác không được phép đăng ký trùng biển số đang có trên hệ thống hoặc đặt lịch bằng xe của người khác.
* **Xóa phương tiện** (✅ Completed): Cho phép xóa phương tiện nếu phương tiện đó chưa có lịch sử đặt lịch trong DB.

### 3. Booking (Đặt lịch)
* **Tạo lịch đặt** (✅ Completed): Khách hàng đặt lịch hẹn rửa xe theo khung giờ mong muốn. Lưu trữ thông tin chi tiết vào bảng `Bookings` và `BookingServices` (giữ snapshot giá dịch vụ tại thời điểm đặt).
* **Kiểm tra ràng buộc thời gian** (✅ Completed): Chặn đặt lịch trong quá khứ, yêu cầu thời gian đặt trước tối thiểu 15 phút.
* **Kiểm tra năng suất trạm** (✅ Completed): Giới hạn tối đa 3 xe/giờ trên cùng một khung giờ.
* **Giới hạn ngày đặt trước** (✅ Completed): Đọc số ngày đặt trước tối đa của hạng thành viên (`Tier.BookingWindowDays`) để giới hạn lịch đặt.
* **Tính toán giá trị hóa đơn** (✅ Completed): Tổng tiền được tính toán trực tiếp ở backend dựa trên giá dịch vụ chính + dịch vụ đi kèm đang được kích hoạt trong DB.
* **Tính điểm tích lũy** (✅ Completed): Điểm thưởng được tính tự động từ backend dựa theo cấu hình tỷ lệ quy đổi điểm từ database.
* **Lịch sử đặt lịch & Lịch hoạt động** (✅ Completed): Tải dữ liệu động thời gian thực từ database qua API `/Customer/GetWashHistory` và `/Customer/GetActiveBooking`.

### 4. Admin Queue (Hàng đợi điều hành)
* **Bảng điều khiển hàng đợi** (✅ Completed): Hiển thị hợp nhất các xe đang trong hàng đợi thực tế và các lịch đặt dự kiến trong ngày chưa check-in (hiển thị dưới dạng ID âm).
* **Check-in xe** (✅ Completed): Admin xác nhận check-in lịch đặt (ID âm), hệ thống tự động tạo bản ghi Queue thực tế có trạng thái bắt đầu là `LPR_Scan`, đổi trạng thái Booking tương ứng thành `CheckedIn`.
* **Cập nhật tiến độ rửa xe** (✅ Completed): Chuyển trạng thái xe qua các bước: `Waiting` -> `LPR_Scan` -> `Washing` -> `Addon_Processing` -> `Drying` -> `Completed`.
* **Thanh toán & Checkout** (✅ Completed): Đánh dấu hoàn tất dịch vụ, ghi nhận thời gian thanh toán `PaidAt`, tự động cộng dồn điểm tích lũy, tổng chi tiêu, lượt ghé thăm cho khách hàng, chèn lịch sử giao dịch điểm và gửi thông báo hoàn tất. Chặn việc checkout trùng lặp.
* **Xử lý xe vãng lai (Walk-in)** (✅ Completed): Tự động khớp biển số xe vãng lai với các lịch đặt chưa check-in trong ngày hoặc tạo mới hàng đợi vãng lai không có booking.

---

## Incomplete Features

Dưới đây là danh sách các chức năng chưa được hoàn thành, đang làm dở hoặc còn đang sử dụng dữ liệu giả lập (mock/local storage):

### 1. Not Started (Chưa thực hiện)
* **Promotion Engine** (Khuyến mãi): Chưa có bảng cơ sở dữ liệu cấu hình mã giảm giá hoạt động, chưa có logic áp dụng mã giảm giá tự động khi tạo lịch đặt. Giao diện quản lý chiến dịch của admin (`AdminPromotions.jsx`) hoàn toàn hoạt động bằng local storage và dữ liệu mock.
* **Survey / Review System** (Khảo sát/Đánh giá): Giao diện lịch sử rửa xe của khách hàng có nút ĐÁNH GIÁ và mở Form khảo sát biểu cảm emoji/star rating, nhưng nút bấm chỉ hiển thị thông báo alert/toast giả lập và lưu tạm vào React state cục bộ, chưa có database và API tiếp nhận đánh giá từ backend.
* **AI Recommendation** (Đề xuất thông minh): Chưa được lên kế hoạch và chưa có mã nguồn liên quan.

### 2. Partial Implementation (Hoàn thành một phần)
* **Admin Dashboard Statistics** (Thống Kê Doanh Thu/Hàng Đợi): Giao diện dashboard của admin hiển thị các chỉ số doanh thu, số xe chờ, số xe đang rửa động, nhưng các chỉ số này được tính toán thủ công bằng cách map qua mảng dữ liệu lấy từ API `/Admin/GetQueue` hàng đợi hôm nay. Chưa có các API thống kê báo cáo riêng biệt cho doanh thu tuần/tháng/năm hay báo cáo tăng trưởng khách hàng từ backend.
* **Voucher / Reward Redemption** (Đổi điểm & Áp dụng Voucher):
  * **View Voucher** (✅ Đã làm): Đọc danh sách voucher đã sở hữu từ database bảng `RewardRedemptions` hiển thị lên ví voucher của khách hàng.
  * **Redeem Voucher** (❌ Chưa làm): Khách hàng bấm ĐỔI điểm trong danh mục Loyalty chỉ hiển thị thông báo giả lập, chưa trừ điểm trong database và chưa tạo mã voucher thực tế.
  * **Apply Voucher** (❌ Chưa làm): Chưa hỗ trợ gán mã voucher đã đổi vào lịch đặt khi khách hàng thực hiện Booking (DTO `CreateBookingDto` chưa hỗ trợ trường chứa VoucherId/PromoCode).

### 3. Mock / Demo Features (Các phần còn dùng dữ liệu giả lập)
* **Quản lý danh mục dịch vụ của Admin** (`AdminServices.jsx`): Khi quản trị viên thêm, sửa, hoặc xóa dịch vụ trên trang quản trị, các thay đổi chỉ được ghi và đọc từ khóa `app_services` trong **localStorage**. Nó không liên kết hay cập nhật trực tiếp vào bảng `Services` trong database.
* **Quản lý khách hàng của Admin** (`AdminCustomers.jsx`): Trang quản lý khách hàng của Admin hiển thị danh sách cứng gồm 3 khách hàng demo (`Lê Tuấn Kiệt`, `Nguyễn Văn A`, `Lê Văn C`). Các thao tác cộng/trừ điểm hay gán voucher ưu đãi chỉ làm thay đổi React state của trang chứ không gọi bất kỳ API backend nào để cập nhật cơ sở dữ liệu thực tế.

---

## Database Status

Hiện trạng cấu trúc cơ sở dữ liệu thông qua khai báo trong `AutoWashDbContext.cs`:

### 1. Các bảng đã tồn tại và cấu hình quan hệ (Entity Framework Core)
* `OtpVerifications`: Lưu mã OTP gửi qua điện thoại/email.
* `Tiers`: Danh sách hạng thành viên (Standard, Silver, Gold, Platinum...).
* `Accounts`: Thông tin tài khoản đăng nhập (Email, Phone, Mật khẩu băm, Role, GoogleId...).
* `Services`: Danh sách dịch vụ rửa chính và phụ.
* `Customers`: Thông tin khách hàng loyalty (Điểm hiện tại, Chi tiêu tích lũy, Số lượt đến...).
* `Vehicles`: Xe đăng ký của khách hàng (gắn kết khóa ngoại với Customer).
* `TierPerks`: Đặc quyền đi kèm từng hạng thành viên đối với các dịch vụ.
* `LoyaltyConfigs`: Cấu hình hệ số quy đổi điểm (ví dụ: chi tiêu bao nhiêu tiền được 1 điểm).
* `Rewards`: Danh sách các phần thưởng có thể đổi bằng điểm (Voucher giảm giá, rửa xe miễn phí...).
* `Campaigns`: Chiến dịch khuyến mãi (chưa sử dụng).
* `Bookings`: Lịch đặt rửa xe (gắn kết Customer và Vehicle).
* `RewardRedemptions`: Lịch sử đổi điểm lấy voucher/quà tặng của khách hàng.
* `BookingServices`: Bảng liên kết trung gian lưu chi tiết dịch vụ của lịch đặt cùng giá snapshot.
* `LoyaltyTransactions`: Lịch sử giao dịch điểm (cộng điểm khi rửa xe, trừ điểm khi đổi quà).
* `Queues`: Hàng đợi điều hành thực tế tại trạm rửa xe.
* `Notifications`: Nhật ký thông báo gửi tới khách hàng.

### 2. Các bảng còn thiếu (Chưa có thực thể)
* Bảng đánh giá dịch vụ (`Surveys` hoặc `Reviews`) để tiếp nhận ý kiến khảo sát mức độ hài lòng của khách hàng sau khi rửa xe.
* Bảng lưu vết lịch sử thao tác hệ thống (`AuditLogs`).

---

## OOP Audit

Đánh giá chất lượng lập trình hướng đối tượng (OOP) và phân chia tầng kiến trúc:

### 1. Controllers (Tầng điều khiển)
* ⚠ **Needs Improvement**: Dù đã tách được các controller chuyên biệt như `BookingController`, `VehicleController`, `AdminQueueController` để giải quyết các API cốt lõi, nhưng `CustomerController` và `AdminController` vẫn còn chứa trực tiếp logic nghiệp vụ và gọi trực tiếp `_context.SaveChangesAsync()` hoặc các câu truy vấn DbContext thô thay vì bàn giao toàn bộ cho tầng Service xử lý.

### 2. Services (Tầng nghiệp vụ)
* ✅ **Good**: Các dịch vụ mới như `AccountService`, `BookingService`, `VehicleService`, `AdminQueueService` đã đóng gói tốt các nghiệp vụ cốt lõi, bảo vệ tính toàn vẹn của dữ liệu thông qua cơ chế Transaction và đảm bảo đúng nguyên tắc OOP.

### 3. DTOs & Entities & Helpers
* ✅ **Good**: Phân chia rõ ràng giữa DTO (đối tượng truyền nhận dữ liệu API), Entity (đại diện bảng database) và Helper (các hàm tiện ích tĩnh như chuẩn hóa biển số, băm mật khẩu).

---

## Technical Debt (Nợ kỹ thuật)

Dưới đây là các điểm hạn chế cần cải thiện về mặt kiến trúc và bảo mật:

* **Authentication (Xác thực)**: Hệ thống đang sử dụng Cookie/Session lưu tạm trên RAM máy chủ để quản lý trạng thái đăng nhập. Trong môi trường production quy mô lớn, cần chuyển đổi sang cơ chế `JWT (JSON Web Token)` để đảm bảo khả năng mở rộng ngang (horizontal scaling) của API.
* **Mật khẩu bảo mật**: Hiện tại đang sử dụng cơ chế băm mật khẩu bằng thuật toán SHA256 cơ bản (trong `PasswordHelper`). Cần nâng cấp lên các thuật toán chống brute-force hiện đại như `BCrypt` hoặc sử dụng `PasswordHasher<T>` mặc định của ASP.NET Core Identity.
* **OTP Phone Reuse**: Dịch vụ OTP xe đang tận dụng trường `Phone` trong bảng `OtpVerifications` để lưu biển số xe xác thực OTP tạm thời để né tránh đổi schema DB ở phase này. Cần bổ sung cột `LicensePlate` và `OtpPurpose` rõ ràng.
* **Kích thước component Frontend**: Một số page như `CustomerDashboard.jsx` và `AdminQueue.jsx` có kích thước tương đối lớn (lên tới hơn 800 dòng code) do tích hợp cả UI, logic xử lý timeline, polling và tính toán chỉ số. Cần phân tách thành các sub-components nhỏ hơn.

---

## Completion Percentage

Ước lượng tỷ lệ hoàn thành dự án dựa trên khối lượng code thực tế:

* **Backend**: **75%** (Hoàn thành tốt các luồng cốt lõi, còn thiếu API quản lý danh mục dịch vụ, API đổi điểm thật, API khuyến mãi và khảo sát đánh giá).
* **Frontend**: **65%** (Giao diện đẹp mắt, Responsive tốt, tuy nhiên nhiều tính năng quản trị khách hàng, danh mục dịch vụ, khuyến mãi mới chỉ dừng lại ở giao diện tĩnh hoặc giả lập localStorage).
* **Database**: **90%** (Cơ cấu bảng và quan hệ đầy đủ, chỉ thiếu bảng lưu đánh giá khảo sát).
* **Overall Project**: **73%**

---

## Recommended Roadmap

Đề xuất lộ trình triển khai và hoàn thiện dự án cho phase tiếp theo theo thứ tự ưu tiên:

### Priority 1: Xóa bỏ hoàn toàn dữ liệu giả lập (Mock) của Admin
* **Kết nối danh mục dịch vụ của Admin**: Viết các API CRUD cho dịch vụ ở backend và cập nhật `AdminServices.jsx` gọi trực tiếp API này thay vì đọc/ghi `app_services` trong localStorage.
* **Kết nối danh sách khách hàng của Admin**: Viết API cho phép admin tải danh sách khách hàng thực từ DB, thực hiện điều chỉnh điểm thưởng trực tiếp vào tài khoản và gán voucher thực vào ví của khách hàng.
* **Hoàn thiện tính năng đổi điểm Loyalty**: Viết API trừ điểm tích lũy và tạo bản ghi `RewardRedemption` thực tế ở backend khi khách hàng yêu cầu đổi ưu đãi.

### Priority 2: Xây dựng bộ máy khuyến mãi & Nâng cấp bảo mật
* **Thiết lập Promotion Engine**: Xây dựng cơ chế cấu hình mã giảm giá (Campaign), bổ sung tham số mã giảm giá trong DTO đặt lịch và tính toán chiết khấu hóa đơn ngay tại `BookingService` trước khi lưu hóa đơn.
* **Chuyển đổi Auth sang JWT**: Thay thế ASP.NET Core Session bằng JWT Bearer Token để tăng tính cơ động và bảo mật cho API.

### Priority 3: Khảo sát đánh giá & Thống kê thông minh
* **Hệ thống đánh giá khảo sát**: Tạo bảng `Reviews`, viết API cho phép gửi đánh giá điểm sao, tag nhanh sau khi check-out và hiển thị điểm đánh giá trung bình lên trang quản trị dịch vụ.
* **Báo cáo thống kê Admin**: Xây dựng API thống kê doanh thu lịch sử theo biểu đồ thời gian và báo cáo phân loại khách hàng phục vụ kinh doanh.

---

## Final Conclusion

### Project Health
* **Good** (Mã nguồn chạy ổn định, giao diện mượt mà, cấu trúc dịch vụ phân tách tốt, các luồng nghiệp vụ cốt lõi đã sạch bóng dữ liệu giả).

### Ready For Demo
* **Yes** (Hệ thống hoạt động rất mượt mà trên môi trường local, giao diện Tesla Premium có timeline rửa xe chạy tự động khớp dữ liệu thật, đủ ấn tượng để demo tiến độ).

### Ready For Final Release
* **No** (Chưa sẵn sàng phát hành cuối cùng do các chức năng quản trị dịch vụ, khách hàng, và khuyến mãi vẫn còn sử dụng local storage/mock dữ liệu).

### Recommended Next Milestone
* **Milestone: Admin Integration & Loyalty Automation** (Tập trung kết nối hoàn chỉnh các chức năng quản trị danh mục dịch vụ, hồ sơ khách hàng thực tế và tự động hóa quy trình đổi thưởng Loyalty).
