# HRM cơ bản — Thiết kế

**Ngày:** 2026-09-12
**Trạng thái:** Approved; đã triển khai xong 13 task + final review (xem
`docs/superpowers/plans/2026-09-12-hrm-basic.md` và ledger tại
`.superpowers/sdd/2026-09-12-hrm-basic/progress.md`).

**Cập nhật sau final review:** phần "Attendance — admin xem tất cả / filter
theo nhân viên" (§4.5, §5.4) — backend đã hỗ trợ `?employeeId=` nhưng UI filter
theo nhân viên trên trang Attendance **chưa được xây** (task brief bỏ sót khi
lập kế hoạch). Admin vẫn xem được toàn bộ bản ghi, chỉ chưa lọc được theo từng
nhân viên. Chấp nhận làm scope cut cho lượt này; có thể bổ sung sau như một
task riêng nếu cần.

## 1. Mục tiêu & phạm vi

Biến starter hiện tại (`server/` Express + `client/` Vite React-TS) thành một phần mềm
HRM cơ bản, gồm:

- Đăng nhập / đăng xuất thật (client gọi server thay vì mock).
- Hai role: `admin` (quản lý) và `employee` (nhân viên), phân quyền cả API lẫn UI.
- Quản lý danh sách nhân viên (CRUD) — chỉ admin.
- Chấm công (check-in / check-out) — nhân viên cho chính mình, admin xem tất cả.
- Nghỉ phép — nhân viên gửi đơn, admin duyệt/từ chối.
- Dữ liệu lưu vào file JSON trên đĩa (không cần DB thật), sống sót qua các lần
  restart server.

Ngoài phạm vi (không làm ở lượt này): payroll/lương, phân quyền chi tiết theo phòng
ban, đăng ký tài khoản tự phục vụ, đổi mật khẩu qua email thật (trang
`ForgotPassword`/`ChangePassword` giữ nguyên giao diện hiện có, đấu nối tối thiểu).

## 2. Kiến trúc tổng quan

```
client (Vite/React, :5173)  --/api, /login, /logout-->  server (Express, :4100)
                                                              |
                                                    server/src/data/db.json
                                                    (employees, attendance,
                                                     leaveRequests, sequences)
```

Client gọi server qua đường dẫn tương đối (`/login`, `/logout`, `/api/...`); Vite
dev proxy forward các path đó sang `http://localhost:4100`. Không cần CORS vì mọi
request đi qua cùng origin lúc dev.

## 3. Dữ liệu & lưu trữ (server)

Gộp "user" và "employee" làm một entity duy nhất — trong HRM, tài khoản đăng nhập
chính là hồ sơ nhân viên.

**`server/src/data/db.json`** (tạo tự động nếu chưa tồn tại, seed dữ liệu mẫu):

```json
{
  "employees": [
    {
      "id": 1, "username": "admin", "password": "123456",
      "fullName": "Admin User", "email": "admin@example.com",
      "phone": "", "position": "HR Manager", "department": "HR",
      "role": "admin", "joinDate": "2024-01-01"
    },
    {
      "id": 2, "username": "employee1", "password": "123456",
      "fullName": "Nguyen Van A", "email": "employee1@example.com",
      "phone": "", "position": "Developer", "department": "Engineering",
      "role": "employee", "joinDate": "2024-03-01"
    }
  ],
  "attendance": [],
  "leaveRequests": [],
  "sequences": { "employees": 2, "attendance": 0, "leaveRequests": 0 }
}
```

**`server/src/store/fileStore.js`** — module chung, chịu trách nhiệm:
- `read()` — đọc + parse `db.json`, tạo file với seed mặc định nếu chưa có.
- `write(data)` — ghi đè toàn bộ file (đồng bộ, `fs.writeFileSync`; project học tập,
  không cần lock/queue phức tạp).
- `nextId(collection)` — tăng bộ đếm trong `sequences` và trả id mới.

`server/src/data/employees.js` thay thế `users.js` hiện tại, dựng trên `fileStore`,
giữ nguyên chữ ký `findUser`, `findByUsername`, `toPublicProfile` (để `auth.route.js`,
`me.route.js` gần như không đổi) và thêm `listEmployees`, `createEmployee`,
`updateEmployee`, `deleteEmployee`.

Tương tự có `server/src/data/attendance.js` và `server/src/data/leaveRequests.js`.

`db.json` được thêm vào `.gitignore` của `server/` (dữ liệu runtime, không commit).

## 4. Backend API

### 4.1 Middleware phân quyền
- `auth.middleware.js` (sửa): sau khi map token → username, tra cứu luôn hồ sơ nhân
  viên (`findByUsername`) và gắn bản public (không password) vào `req.user` — bao
  gồm `role`. Giữ nguyên `req.token`.
- `role.middleware.js` (mới): `requireRole('admin')` — trả `403` nếu
  `req.user.role` không khớp. Dùng sau `requireAuth` trên các route admin-only.

### 4.2 Auth (đã có, không đổi hành vi)
`POST /login`, `POST /logout`, `GET /api/me` — vẫn hoạt động như cũ, chỉ đổi nguồn
dữ liệu sang `employees.js`.

### 4.3 Employees — `server/src/routes/employee.route.js`
Tất cả yêu cầu `requireAuth` + `requireRole('admin')`, trừ khi ghi chú khác.

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/employees` | Danh sách tất cả nhân viên (không kèm password) |
| POST | `/api/employees` | Tạo nhân viên mới (validate username trùng, các field bắt buộc) |
| PUT | `/api/employees/:id` | Cập nhật hồ sơ + role |
| DELETE | `/api/employees/:id` | Xoá nhân viên (chặn tự xoá chính mình) |

### 4.4 Attendance — `server/src/routes/attendance.route.js`
Tất cả yêu cầu `requireAuth`.

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/attendance/check-in` | Ghi check-in cho chính người gọi (chặn check-in 2 lần/ngày chưa check-out) |
| POST | `/api/attendance/check-out` | Ghi check-out cho bản ghi check-in đang mở của chính mình |
| GET | `/api/attendance` | `employee`: chỉ bản ghi của mình. `admin`: tất cả, hỗ trợ query `?employeeId=` |

### 4.5 Leave requests — `server/src/routes/leave.route.js`
Tất cả yêu cầu `requireAuth`.

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/leave-requests` | Nhân viên tạo đơn (`fromDate`, `toDate`, `reason`) → status `pending` |
| GET | `/api/leave-requests` | `employee`: đơn của mình. `admin`: tất cả, hỗ trợ query `?status=` |
| PATCH | `/api/leave-requests/:id` | Chỉ admin — body `{ status: 'approved' \| 'rejected' }` |

Mọi route mới có Swagger annotation theo đúng style các route hiện có (`hello.route.js`,
`auth.route.js`), đăng ký trong `server.js` và tag riêng trong `swagger.js` nếu cần.

### 4.6 Error handling
Theo pattern hiện có: lỗi trả JSON `{ message }` với status code phù hợp
(400 thiếu field/dữ liệu không hợp lệ, 401 chưa đăng nhập, 403 sai quyền, 404 không
tìm thấy). Không cần global error handler mới — mỗi route tự validate và trả lỗi.

## 5. Frontend

### 5.1 Dọn dẹp demo (đã được xác nhận)
Xoá các phần chỉ phục vụ demo, không liên quan HRM:
- `src/components/Examples/ExampleComponents.tsx`
- `src/components/dialogs/DialogExample.tsx` (chỉ được dùng bởi ExampleComponents)
- `src/components/dialogs/DialogForm.tsx` (hardcode render `ExampleComponents` bên
  trong, không phải wrapper tái sử dụng được — trang Employees sẽ có form dialog
  riêng của nó, xem 5.4)
- `src/modules/todos.ts`, `src/services/todoService.ts`, `src/interfaces/todo.ts`
- `TODO`-related key trong `src/consts/queriesKeys.ts`
- Import các thứ trên khỏi `Homepage`

Giữ nguyên toàn bộ UI kit dùng chung (`components/ui/*`, `customFieldsFormik/*`,
`dialogs/DialogConfirm.tsx` — component này generic, không đụng tới `ExampleComponents`
— hooks, i18n, providers...).

### 5.2 Auth thật
- `client/vite.config.ts`: thêm `server.proxy` cho `/api`, `/login`, `/logout` →
  `http://localhost:4100`.
- `AuthenticationProvider.tsx`: bỏ toàn bộ mock (`don/don`, mock token/user). `login()`
  gọi `POST /login` → nhận `token` → gọi `GET /api/me` → lưu `token` + `user` (qua
  `httpService`), `attachTokenToHeader`, điều hướng `Homepage`. Lỗi 401 → toast
  "Sai tài khoản hoặc mật khẩu". `logout()` gọi `POST /logout` (best-effort, vẫn xoá
  local storage + reload nếu request lỗi).
- Khi app khởi động và đã có token trong storage, gắn header + (tuỳ chọn) gọi lại
  `/api/me` để đồng bộ; giữ đơn giản bằng cách tin dữ liệu `user` đã cache trong
  storage như hiện tại nếu còn token.
- `interfaces/user.ts`: đổi theo response thật của server —
  `{ id, username, fullName, email, phone, position, department, role, joinDate }`
  với `role: 'admin' | 'employee'` (field số ít, đúng như server trả về — không bọc
  thành mảng `roles`).

### 5.3 Rút gọn phân quyền
`consts/common.ts`: `PERMISSION_ENUM` còn `PUBLIC`, `ADMIN = 'admin'`,
`EMPLOYEE = 'employee'` (bỏ `APP_MANAGER`, `USER`). Cập nhật `PermissionOptions`.
`withCheckRole.tsx` đổi sang so sánh `user?.role` (số ít) thay vì `user?.roles?.[0]`.
`AuthenticationProvider` tính `isAdmin`/`isEmployee` từ `user?.role === PERMISSION_ENUM.ADMIN`
(tương tự cho employee).

### 5.4 Trang & route mới
`consts/baseUrl.ts` thêm: `Employees: "/employees"`, `Attendance: "/attendance"`,
`LeaveRequests: "/leave-requests"` (xoá `Todos`, `AppManagement`, `CreateApp`,
`AppConnect`, `Users` nếu không dùng nữa — thay bằng các path HRM).

| Trang | Route | Ai thấy | Nội dung |
|---|---|---|---|
| `Homepage` (Dashboard) | `/` | cả hai | Admin: tổng số nhân viên, số đơn nghỉ phép chờ duyệt. Nhân viên: trạng thái chấm công hôm nay, số đơn nghỉ phép của mình theo trạng thái |
| `Employees` | `/employees` | admin only | Bảng nhân viên (dùng `components/ui/table.tsx`) + `DialogForm` để thêm/sửa, `DialogConfirm` để xoá |
| `Attendance` | `/attendance` | cả hai | Nhân viên: nút Check-in/Check-out + bảng lịch sử của mình. Admin: bảng tất cả, filter theo nhân viên |
| `LeaveRequests` | `/leave-requests` | cả hai | Nhân viên: form gửi đơn + bảng đơn của mình kèm trạng thái. Admin: bảng tất cả đơn + nút duyệt/từ chối |

Trang admin-only (`Employees`) bọc bằng `withCheckRole(Component, [PERMISSION_ENUM.ADMIN])`
giống pattern HOC đã có sẵn trong repo.

`Sidebar` hiện có danh sách menu demo cứng (`Dashboard`, `Task`, `Apps`, `Users` trỏ
tới các route không tồn tại). Thay hẳn bằng danh sách HRM: `Dashboard` (`/`),
`Attendance` (`/attendance`), `Leave Requests` (`/leave-requests`) luôn hiển thị, và
`Employees` (`/employees`) chỉ hiển thị khi `isAdmin`.

### 5.5 Service layer (client)
Theo đúng pattern `todoService.ts` cũ (bỏ) / `httpService.ts` hiện có: thêm
`employeeService.ts`, `attendanceService.ts`, `leaveRequestService.ts`, mỗi service
export các hàm gọi `httpService.get/post/put/delete`, và tương ứng
`modules/employees.ts`, `modules/attendance.ts`, `modules/leaveRequests.ts` bọc bằng
`@tanstack/react-query` (`useQuery`/`useMutation`), theo đúng pattern
`modules/todos.ts` cũ.

## 6. Kiểm thử / xác minh

Project không có test runner sẵn (không thấy `jest`/`vitest` config). Xác minh bằng
tay theo kịch bản, sau khi cài đặt xong:

1. `cd server && npm install && npm run dev` — server chạy ở `:4100`.
2. `cd client && npm install && npm run dev` — client chạy ở `:5173`.
3. Đăng nhập bằng `admin/123456` → vào Dashboard admin, thấy menu Employees.
4. Tạo/sửa/xoá 1 nhân viên trong `Employees`.
5. Đăng xuất, đăng nhập bằng tài khoản nhân viên mới tạo → không thấy menu
   Employees; check-in/check-out trong Attendance; gửi 1 đơn nghỉ phép.
6. Đăng nhập lại bằng admin → thấy đơn nghỉ phép chờ duyệt, duyệt hoặc từ chối.
7. Restart server → dữ liệu (nhân viên mới, chấm công, đơn nghỉ phép) vẫn còn
   (xác nhận file `db.json` đã ghi đúng).
8. Gọi thử 1 API admin-only bằng token của nhân viên (qua Swagger UI
   `/api-docs`) → nhận `403`.

Không thêm test tự động ở lượt này (ngoài phạm vi "cơ bản"); có thể bổ sung sau nếu
cần.

## 7. Rủi ro / lưu ý
- Ghi file đồng bộ (`fs.writeFileSync`) không an toàn khi có nhiều request ghi đồng
  thời — chấp nhận được cho quy mô "project học tập", không dùng cho production.
- Không hash password (giữ plaintext như `users.js` hiện tại) — vẫn ghi rõ comment
  "demo only, do not use in production" như code gốc đã có.
- Không có refresh token / hết hạn token — giữ nguyên cơ chế token vĩnh viễn
  trong bộ nhớ như hiện tại.
