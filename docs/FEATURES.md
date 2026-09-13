# Giới thiệu phần mềm HRM

Phần mềm quản lý nhân sự cơ bản, có 2 vai trò: **Quản lý (admin)** và
**Nhân viên (employee)**. Giao diện hỗ trợ song ngữ Việt/Anh (mặc định
tiếng Việt), chuyển đổi được ngay trên thanh điều hướng.

Tài khoản demo có sẵn: `admin` / `123456` (quản lý), `employee1` / `123456`
(nhân viên).

## 1. Đăng nhập / Đăng xuất

- Đăng nhập bằng tài khoản/mật khẩu thật (không phải giả lập), có thông báo
  lỗi rõ ràng khi sai thông tin.
- Phiên đăng nhập được lưu lại, tự động khôi phục khi mở lại trình duyệt.
- Đăng xuất từ menu ở góc trên bên phải (cạnh avatar).

## 2. Trang tổng quan (Dashboard)

Trang đầu tiên sau khi đăng nhập, nội dung khác nhau theo vai trò:

- **Quản lý**: tổng số nhân viên, số đơn nghỉ phép đang chờ duyệt.
- **Nhân viên**: số đơn nghỉ phép của mình đang chờ duyệt, tình trạng chấm
  công hôm nay (đã vào ca hay chưa).

Có nút "Làm mới" để cập nhật số liệu ngay lập tức.

## 3. Quản lý nhân viên *(chỉ Quản lý)*

- Xem danh sách toàn bộ nhân viên: tên đăng nhập, họ tên, email, phòng ban,
  vai trò.
- Thêm nhân viên mới (đặt tài khoản, mật khẩu, thông tin cá nhân, vai trò,
  lương cơ bản).
- Sửa thông tin nhân viên (trừ tên đăng nhập).
- Xóa nhân viên (không tự xóa được chính tài khoản đang đăng nhập).

Nhân viên thường không truy cập được trang này.

## 4. Chấm công

- **Nhân viên**: bấm "Chấm công vào" khi bắt đầu làm, "Chấm công ra" khi kết
  thúc — chỉ được vào ca 1 lần cho tới khi ra ca. Xem lại lịch sử chấm công
  của chính mình.
- **Quản lý**: xem được lịch sử chấm công của tất cả nhân viên.

## 5. Nghỉ phép

- **Nhân viên**: gửi đơn xin nghỉ phép (từ ngày – đến ngày – lý do), theo
  dõi trạng thái đơn (chờ duyệt / đã duyệt / từ chối).
- **Quản lý**: xem tất cả đơn nghỉ phép của mọi nhân viên, duyệt hoặc từ
  chối từng đơn.

## 6. Ngày công & Lương

- **Ngày công chuẩn**: một con số áp dụng chung toàn công ty (ví dụ 26
  ngày/tháng), quản lý có thể chỉnh sửa trực tiếp trên trang Lương.
- **Xem ngày công thực tế**: hệ thống tự đếm số ngày nhân viên có chấm công
  trong tháng (không cần nhập tay), so sánh với ngày công chuẩn để biết ai
  đủ công, ai thiếu công.
- **Chốt lương**: quản lý chọn tháng, xem bảng tổng hợp mọi nhân viên (ngày
  công, lương cơ bản, lương dự kiến), bấm "Chốt lương" để tính và lưu lại —
  công thức: `lương cơ bản ÷ ngày công chuẩn × ngày công thực tế + thưởng/phạt`.
  Có thể nhập thêm khoản thưởng/phạt và ghi chú trước khi chốt.
- **Sửa lương đã chốt**: chỉnh lại khoản thưởng/phạt hoặc ghi chú mà không
  làm thay đổi số ngày công đã ghi nhận lúc chốt.
- **Chốt lại**: nếu cần tính lại từ đầu (ví dụ dữ liệu chấm công có cập nhật
  sau khi đã chốt), quản lý có nút "Chốt lại" riêng để tính lại toàn bộ.
- **Nhân viên**: chỉ xem được lịch sử lương của chính mình theo từng tháng,
  không xem được của người khác, không chỉnh sửa được.

## 7. Đổi mật khẩu / Quên mật khẩu

Có sẵn màn hình đổi mật khẩu (trong menu tài khoản) và quên mật khẩu (từ
trang đăng nhập).

## Phân quyền tổng quát

| Chức năng | Quản lý | Nhân viên |
|---|---|---|
| Quản lý nhân viên (thêm/sửa/xóa) | ✅ | ❌ |
| Xem chấm công của mọi người | ✅ | Chỉ của mình |
| Duyệt/từ chối đơn nghỉ phép | ✅ | Chỉ gửi đơn của mình |
| Sửa ngày công chuẩn | ✅ | ❌ |
| Chốt / sửa / chốt lại lương | ✅ | ❌ |
| Xem lương | Của mọi người | Chỉ của mình |

Toàn bộ phân quyền được kiểm soát ở cả giao diện lẫn máy chủ — dù có cố
truy cập trực tiếp bằng API, nhân viên vẫn không thể thực hiện các thao tác
dành riêng cho quản lý.
