# Chuyển từ file JSON sang MongoDB — Thiết kế

**Ngày:** 2026-09-13
**Trạng thái:** Approved (chờ viết implementation plan)

## 1. Mục tiêu & phạm vi

Thay lớp lưu trữ dữ liệu phía server (hiện đang là 1 file JSON qua
`server/src/store/fileStore.js`) bằng MongoDB (cluster Atlas người dùng đã
kết nối thử thành công). **Không đổi bất kỳ logic nghiệp vụ, route, hay
hợp đồng API nào** — client không cần sửa gì cả. Đây thuần túy là đổi nơi
lưu trữ.

Ngoài phạm vi (không làm ở lượt này): di trú dữ liệu từ `db.json` cũ sang
Mongo (người dùng xác nhận dữ liệu hiện tại chỉ là dữ liệu test, bắt đầu
lại bằng seed mới); giữ file JSON làm phương án dự phòng (bỏ hẳn, chỉ dùng
Mongo); chuyển session/token đăng nhập vào Mongo (giữ nguyên trong bộ nhớ).

## 2. Vấn đề bảo mật cần xử lý ngay

`server/src/server.js` hiện đang có đoạn code Atlas tự sinh, với
**connection string chứa mật khẩu thật ở dạng plaintext trong source code**.
Việc đầu tiên của migration này là chuyển chuỗi đó ra `server/.env` (đã có
sẵn trong `server/.gitignore`), không còn nằm trong bất kỳ file nào được
theo dõi bởi git.

## 3. Hạ tầng kết nối

- Thêm dependency `dotenv` (nhỏ, gọn, chuẩn mực) để nạp `server/.env`.
- `server/.env` (gitignored): `MONGO_URI=...`, `MONGO_DB_NAME=hrm`.
- `server/.env.example` (không gitignore): file mẫu, chỉ có tên biến, không
  có giá trị thật — để ai clone project cũng biết cần khai báo gì.
- `server/src/store/mongoClient.js` — module duy nhất chịu trách nhiệm:
  - `connectMongo()`: kết nối 1 lần khi khởi động server, seed dữ liệu mặc
    định nếu database rỗng (xem §5), trả về khi sẵn sàng.
  - `getDb()`: trả về instance `Db` đã kết nối, dùng xuyên suốt các module
    dữ liệu khác.
  - `nextId(collectionName)`: cấp số `id` tuần tự tiếp theo cho 1 collection,
    dùng `findOneAndUpdate` với `$inc` trên collection `counters` — an toàn
    khi có nhiều request ghi cùng lúc (khác với cách cũ trong file, vốn
    không đảm bảo điều này).
  - `omitMongoId(doc)` / `omitMongoId(docs[])`: bỏ trường `_id` (ObjectId)
    của Mongo trước khi trả dữ liệu ra route/client — client không cần biết
    Mongo tồn tại, hình dạng response giữ nguyên như trước.
- `server/src/server.js`: kết nối Mongo xong mới `app.listen(...)` — nếu
  kết nối thất bại, log lỗi và thoát tiến trình (fail fast), không khởi
  động server ở trạng thái không có dữ liệu.

## 4. Giữ nguyên hệ `id` số nguyên (không dùng ObjectId của Mongo)

Toàn bộ code hiện tại (server lẫn client) dùng `id` là số nguyên tăng dần
(`employeeId` làm khóa ngoại trong attendance/leaveRequests/payrollRecords,
`req.params.id`, kiểu `number` trong TypeScript...). Đổi sang ObjectId của
Mongo sẽ kéo theo sửa rất nhiều nơi không cần thiết.

Cách làm: mỗi document Mongo vẫn có `_id` riêng (Mongo tự sinh, bị bỏ qua
hoàn toàn, không dùng để truy vấn nghiệp vụ), nhưng vẫn lưu thêm trường
`id: number` — giữ đúng vai trò như file cũ. Cấp số qua `nextId()` (§3).
Mọi truy vấn theo id (`findOne`, `updateOne`, `deleteOne`...) đều lọc theo
trường `id` này, không phải theo `_id`.

## 5. Collection & seed dữ liệu mặc định

| Collection | Thay cho | Ghi chú |
|---|---|---|
| `employees` | `db.employees` (mảng trong file cũ) | mỗi document như cũ, cộng `id` số |
| `attendance` | `db.attendance` | như cũ |
| `leaveRequests` | `db.leaveRequests` | như cũ |
| `payrollRecords` | `db.payrollRecords` | như cũ |
| `settings` | `db.settings` (object đơn) | **đúng 1 document duy nhất**, nhận diện qua trường cố định `key: 'global'` |
| `counters` | `db.sequences` | mỗi document `{ _id: '<tên collection>', seq: number }` |

Mỗi lần `connectMongo()` chạy, kiểm tra **độc lập từng collection** (không
gộp chung 1 điều kiện) để việc seed idempotent — chạy lại bao nhiêu lần
cũng không tạo dữ liệu trùng, kể cả khi trạng thái ban đầu chỉ có 1 phần:
- Nếu `employees` rỗng: seed đúng 2 tài khoản demo hiện có (`admin`/`123456`
  role admin, `employee1`/`123456` role employee, đầy đủ trường kể cả
  `baseSalary: 0`), đồng thời khởi tạo `counters.employees = 2`.
- Nếu document `counters` cho `attendance`/`leaveRequests`/`payrollRecords`
  chưa tồn tại: khởi tạo mỗi cái ở giá trị `0`.
- Nếu collection `settings` rỗng: khởi tạo
  `{ key: 'global', standardWorkDays: 26 }`.

## 6. Các module dữ liệu (`server/src/data/*.js`)

Toàn bộ hàm public của 5 file này **đổi từ đồng bộ sang `async`**, giữ
nguyên tên hàm, tham số, và ý nghĩa trả về (chỉ khác: giờ trả `Promise`).
Logic nghiệp vụ bên trong (công thức tính lương, quy tắc 1 lần check-in
tại 1 thời điểm, validate `standardWorkDays`...) **giữ nguyên 100%** —
chỉ đổi `db.xxx.find(...)`/`fileStore.write(db)` thành các lệnh Mongo
(`collection.find(...).toArray()`, `collection.insertOne(...)`,
`collection.updateOne(...)`, v.v.), và `nextId()`/`omitMongoId()` gọi qua
`mongoClient.js`.

`employees.js`: `findUser`, `findByUsername`, `findById`, `listEmployees`,
`createEmployee`, `updateEmployee`, `deleteEmployee`, `toPublicProfile` (hàm
thuần, không đổi — chỉ bỏ thêm `_id` ngoài `password` khi ẩn thông tin).

`attendance.js`: `checkIn`, `checkOut`, `listAttendance`. Quy tắc "1 người
chỉ được mở 1 ca chưa check-out" giữ nguyên (kiểm tra qua truy vấn Mongo
thay vì `Array.find`).

`leaveRequests.js`: `createLeaveRequest`, `listLeaveRequests`,
`updateLeaveRequestStatus`.

`settings.js`: `getSettings`, `updateSettings` — thao tác trên document
`settings` duy nhất (`key: 'global'`), validate `standardWorkDays` giữ
nguyên như cũ.

`payroll.js`: `getSummary`, `generatePayroll`, `updatePayrollAdjustment`,
`listPayroll`. `countActualWorkDays` vẫn lấy toàn bộ bản ghi chấm công của
1 nhân viên (gọi `listAttendance` — giờ là `async`) rồi lọc/đếm ngày phân
biệt bằng JavaScript y hệt logic cũ (không đẩy việc lọc xuống truy vấn
Mongo) — giữ hành vi giống hệt trước, giảm rủi ro sai lệch khi chuyển đổi.

## 7. Route & middleware

Mọi route handler gọi các hàm ở §6 phải thêm `await` (bản thân handler trở
thành `async`). `server/src/middleware/auth.middleware.js`'s `requireAuth`
cũng trở thành `async` (vì gọi `findByUsername`, giờ là async) — bọc lệnh
gọi Mongo trong `try/catch`, lỗi kết nối bất ngờ trả về `500 {message}`
thay vì làm crash server; các nhánh 401 hiện có (token không hợp lệ, nhân
viên bị xóa) giữ nguyên. `role.middleware.js` không đổi (không chạm dữ
liệu). Không đổi status code, path, hay hình dạng response ở bất kỳ route
nào — hợp đồng API giữ nguyên để client không cần sửa.

## 8. Dọn dẹp

- Xóa `server/src/store/fileStore.js` và `server/src/data/db.json`.
- Bỏ dòng `src/data/db.json` khỏi `server/.gitignore` (không còn ý nghĩa).
- Cập nhật `README.md`: phần hướng dẫn chạy server cần thêm bước tạo
  `server/.env` từ `server/.env.example` với `MONGO_URI` thật — server sẽ
  không khởi động được nếu thiếu biến này (đổi từ "không cần cài DB" sang
  "cần khai báo kết nối Mongo").

## 9. Kiểm thử / xác minh

Không có test runner tự động (giữ nguyên như các spec trước). Xác minh
bằng cách chạy `npm run dev` thật và gọi `curl` **đối chiếu với cluster
Mongo thật đã kết nối được** (không cần mock) — lặp lại đúng bộ kịch bản
đã dùng để xác minh backend ở 2 lần trước (login, CRUD nhân viên, chấm
công, nghỉ phép, cài đặt & lương), cộng thêm: khởi động server 2 lần liên
tiếp để xác nhận seed không bị lặp/trùng ở lần thứ 2.

## 10. Rủi ro / lưu ý

- `requireAuth` giờ có thêm 1 lượt gọi Mongo trên mỗi request — chấp nhận
  được ở quy mô demo/học tập, không tối ưu bằng cache.
- Không có transaction/rollback khi 1 thao tác cần ghi nhiều collection
  (ví dụ `generatePayroll` chỉ ghi 1 document nên không bị ảnh hưởng) —
  không phát sinh vấn đề mới so với thiết kế hiện tại.
- Mật khẩu Mongo từng nằm plaintext trong `server.js` — đã được nhắc người
  dùng nên đổi lại sau khi migration xong.
