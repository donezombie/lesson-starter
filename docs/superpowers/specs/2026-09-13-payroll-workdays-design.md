# Quản lý ngày công & lương — Thiết kế

**Ngày:** 2026-09-13
**Trạng thái:** Approved (chờ viết implementation plan)

## 1. Mục tiêu & phạm vi

Mở rộng phần mềm HRM đã có (xem `docs/superpowers/specs/2026-09-12-hrm-basic-design.md`,
đã triển khai xong) với hai tính năng mới, làm chung 1 đợt vì liên quan chặt chẽ:

- **Xem ngày công**: mỗi tháng, xem nhân viên nào có đủ số ngày công chuẩn hay
  thiếu, dựa trên dữ liệu chấm công (Attendance) đã có sẵn — không cần nhập tay.
- **Quản lý lương**: mỗi nhân viên có lương cơ bản/tháng; admin "chốt" lương
  hàng tháng dựa trên ngày công thực tế, có thể thêm thưởng/phạt bằng tay trước
  khi chốt. Nhân viên tự xem được lương của mình; admin xem/quản lý tất cả.

Ngoài phạm vi (không làm ở lượt này): thuế/bảo hiểm, phiếu lương PDF, nhiều
loại phụ cấp, lịch sử chỉnh sửa (audit log) của bản ghi lương, thông báo qua
email khi chốt lương.

## 2. Dữ liệu

### 2.1 Employee — thêm 1 trường

`server/src/data/employees.js`: thêm `baseSalary: number` (mặc định `0`) vào
danh sách trường có thể tạo (`createEmployee`) và sửa (`updateEmployee`'s
`editableFields`). Không cần validate phức tạp — số âm hay không nhập coi như
lỗi nhập liệu chấp nhận được ở quy mô "cơ bản" này (không thêm ràng buộc
`>= 0`, giữ tối giản như các trường khác của employee).

### 2.2 Settings — 1 cấu hình toàn công ty

Thêm collection `settings` (một document duy nhất, không có nhiều bản ghi)
vào `db.json`:

```json
"settings": { "standardWorkDays": 26 }
```

Seed mặc định `standardWorkDays: 26` trong `fileStore.js`'s `DEFAULT_DB`.
`server/src/data/settings.js`: `getSettings()` / `updateSettings(payload)`
(chỉ nhận field `standardWorkDays`, ép kiểu số nguyên dương; nếu
`payload.standardWorkDays` không phải số nguyên dương thì giữ nguyên giá trị
cũ — không throw, để route tự validate và trả 400 rõ ràng hơn ở tầng route).

### 2.3 PayrollRecord — bản ghi lương đã chốt

Thêm vào `db.json`: `"payrollRecords": []`, `sequences.payrollRecords: 0`.

```json
{
  "id": 1,
  "employeeId": 2,
  "month": "2026-09",
  "baseSalary": 15000000,
  "standardWorkDays": 26,
  "actualWorkDays": 22,
  "adjustment": 500000,
  "totalPay": 13192307,
  "note": "Thưởng đủ KPI",
  "createdAt": "2026-09-30T10:00:00.000Z"
}
```

- `month`: chuỗi `"YYYY-MM"`.
- `baseSalary`, `standardWorkDays`: **snapshot** tại thời điểm chốt (không đọc
  lại `employee.baseSalary`/`settings.standardWorkDays` sau này — nếu 2 giá
  trị đó đổi sau khi đã chốt, bản ghi cũ không bị ảnh hưởng, đúng bản chất của
  "đã chốt lương tháng đó").
- `actualWorkDays`: số ngày (distinct theo `date`) nhân viên có bản ghi
  `attendance` mà `date` nằm trong tháng đó, tại thời điểm tính/chốt.
- `totalPay = round(baseSalary / standardWorkDays * actualWorkDays) + adjustment`
  (làm tròn xuống đơn vị đồng bằng `Math.round`).
- `adjustment`: số (có thể âm), mặc định `0` — thưởng/phạt admin nhập tay.
- Chốt lại một nhân viên/1 tháng đã có bản ghi → **ghi đè** bản ghi cũ (giữ
  nguyên `id`), không tạo bản ghi trùng — vì "chốt lại" nghĩa là tính lại dựa
  trên ngày công mới nhất, không phải tạo thêm 1 kỳ lương khác cho cùng tháng.

## 3. Backend API

Tất cả route mới nằm trong `server/src/routes/payroll.route.js`, dùng
`requireAuth` (đã có) và `requireRole('admin')` (đã có) đúng theo pattern các
route hiện tại. Đăng ký thêm 1 dòng `require` + 1 dòng `app.use('/api', ...)`
vào `server/src/server.js` (thêm, không sửa các dòng cũ — đúng pattern các
route trước).

### 3.1 Settings

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/settings` | mọi user đã đăng nhập | Trả `{ standardWorkDays }` |
| PUT | `/api/settings` | admin | Sửa `standardWorkDays` (số nguyên dương); 400 nếu không hợp lệ |

### 3.2 Payroll

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/payroll/summary?month=YYYY-MM` | admin | Bảng tổng hợp real-time mọi nhân viên: `actualWorkDays` (tính từ Attendance hiện tại), `standardWorkDays` (từ settings hiện tại), `baseSalary` (từ employee hiện tại), `meetsRequirement` (`actualWorkDays >= standardWorkDays`), `estimatedPay` (tính live, chưa lưu), `existingRecordId` (id bản ghi đã chốt tháng đó nếu có, else `null`) |
| GET | `/api/payroll?month=&employeeId=` | mọi user đã đăng nhập | `employee`: luôn chỉ trả bản ghi của chính mình (bỏ qua `employeeId` query nếu có — giống pattern attendance/leave-requests). `admin`: trả tất cả, lọc theo `month`/`employeeId` nếu truyền |
| POST | `/api/payroll/generate` | admin | Body `{ employeeId, month, adjustment?, note? }`. Dùng khi **chưa có** bản ghi cho `(employeeId, month)`. Tính `actualWorkDays` từ Attendance, snapshot `baseSalary`/`standardWorkDays` hiện tại, tính `totalPay`, tạo mới. Nếu `(employeeId, month)` đã tồn tại → vẫn ghi đè (upsert), coi như "chốt lại từ đầu", nhưng UI ở §4.2 không có nút gọi lại đường này cho bản ghi đã tồn tại — chỉ dùng PATCH để sửa. 400 nếu thiếu `employeeId`/`month` hoặc nhân viên không tồn tại |
| PATCH | `/api/payroll/:id` | admin | Body `{ adjustment?, note? }` — sửa bản ghi **đã tồn tại**, chỉ đổi 2 trường này rồi tính lại `totalPay` từ `baseSalary`/`standardWorkDays`/`actualWorkDays` đã snapshot lúc tạo — **không tính lại `actualWorkDays`** (tránh việc sửa thưởng/phạt vô tình làm đổi luôn ngày công đã chốt nếu dữ liệu chấm công thay đổi sau đó). 404 nếu không tìm thấy |

### 3.3 Error handling

Theo đúng pattern hiện có: JSON `{ message }`, status 400 (thiếu field/giá trị
sai)/401/403/404.

## 4. Frontend

### 4.1 Employee — thêm ô lương cơ bản

`EmployeeFormDialog.tsx`: thêm 1 `InputField` số (`type="number"`) cho
`baseSalary`, không bắt buộc (mặc định 0 nếu để trống). `interfaces/user.ts`'s
`UserInfo` thêm `baseSalary: number`.

### 4.2 Trang Payroll mới (`/payroll`, cả 2 role vào được)

- **Admin**: chọn tháng (input `type="month"`, mặc định tháng hiện tại), ô sửa
  nhanh "Ngày công chuẩn" (số + nút Lưu, gọi `PUT /api/settings`), bảng
  `payroll/summary` cho tháng đang chọn: Nhân viên | Ngày công thực tế / chuẩn
  | Trạng thái (badge Đủ công / Thiếu công) | Lương cơ bản | Lương dự kiến |
  1 nút hành động mỗi dòng:
  - Chưa có `existingRecordId`: nút **"Chốt lương"** → mở dialog nhập
    `adjustment` + `note` (mặc định 0/rỗng) → submit gọi `POST /api/payroll/generate`.
  - Đã có `existingRecordId`: nút **"Sửa"** → mở cùng dialog, prefill
    `adjustment`/`note` từ bản ghi đã chốt (hiển thị thêm `actualWorkDays` đã
    đóng băng, chỉ đọc) → submit gọi `PATCH /api/payroll/:id` (không tính lại
    ngày công).
- **Nhân viên**: chọn tháng, bảng lịch sử lương của chính mình
  (`GET /api/payroll?month=`): Tháng | Ngày công thực tế | Lương cơ bản |
  Điều chỉnh | Thực nhận. Không thấy nút chốt/sửa.
- Route không bọc `withCheckRole` (cả 2 role đều vào được trang, nội dung
  khác nhau theo `isAdmin`, giống pattern trang Attendance/LeaveRequests).

### 4.3 Điều hướng

`Sidebar`: thêm mục "Lương" (`sidebar.payroll`), hiển thị cho cả 2 role, sau
mục "Đơn nghỉ phép". `baseUrl.ts` thêm `Payroll: "/payroll"`. `App.tsx` thêm
1 `<Route>` mới trong khối `PrivateRoute`/`DefaultLayout` hiện có.

### 4.4 i18n

Thêm namespace `payroll` vào `en/shared.json` và `vi/shared.json` theo đúng
pattern các trang trước (đủ 2 file, key khớp nhau).

## 5. Kiểm thử / xác minh

Không có test runner tự động (giữ nguyên như spec trước). Xác minh tay:

1. Admin sửa "Ngày công chuẩn" → 26, lưu thành công.
2. Admin sửa lương cơ bản 1 nhân viên (ví dụ 15,000,000).
3. Nhân viên đó check-in/check-out vài ngày (dùng Attendance có sẵn).
4. Admin vào trang Lương, chọn đúng tháng → thấy đúng số ngày công thực tế
   của nhân viên đó, đúng trạng thái Đủ/Thiếu (so với 26).
5. Admin bấm "Chốt lương", nhập thưởng 500,000, xác nhận → `totalPay` đúng
   công thức, bản ghi xuất hiện trong lịch sử.
6. Admin bấm "Sửa" trên bản ghi vừa chốt, đổi `adjustment` → `totalPay` cập
   nhật đúng theo `adjustment` mới, `actualWorkDays` giữ nguyên như lúc chốt
   (không đổi dù nhân viên check-in thêm sau đó), `id` không đổi.
7. Đăng nhập bằng chính nhân viên đó → vào trang Lương → thấy đúng bản ghi
   vừa chốt, không thấy nút Chốt/Sửa, không gọi được `/api/payroll/summary`
   (403 nếu cố truy cập bằng token nhân viên qua Swagger).
8. Nhân viên khác (chưa từng chốt lương tháng này) đăng nhập → trang Lương
   trống/không có bản ghi tháng đó — không lỗi.

## 6. Rủi ro / lưu ý

- `actualWorkDays` tính từ **số ngày có bản ghi check-in**, không phân biệt
  check-in nửa ngày hay đủ giờ (giữ nhất quán với cách dữ liệu Attendance
  hiện có đang lưu — chỉ có check-in/check-out theo ngày, không có "số giờ").
- Không có cơ chế khóa tháng đã chốt — admin có thể chốt lại bất cứ lúc nào
  (chấp nhận được ở quy mô "cơ bản", không làm audit log/khóa kỳ lương).
- `standardWorkDays` là 1 cấu hình duy nhất cho toàn công ty (không theo
  từng nhân viên) — đúng như đã chọn ở bước hỏi yêu cầu.
