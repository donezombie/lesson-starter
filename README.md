# study

Repo gồm 2 phần:

- `server/` — Express API (đã có sẵn code)
- `client/` — Frontend (bạn cần tự tạo, xem hướng dẫn bên dưới)

## Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- npm (đi kèm Node.js)

## 1. Tạo folder `client`

Nếu bạn clone repo lần đầu, thư mục `client/` sẽ chưa có project frontend bên trong. Hãy tạo nó bằng Vite (React + TypeScript):

```bash
# chạy ở thư mục gốc của repo
npm create vite@latest client -- --template react-ts
cd client
npm install
```

> Nếu `client/` đã tồn tại (rỗng), lệnh trên vẫn dùng được — Vite sẽ scaffold project vào đúng thư mục đó.

Chạy dev server của client:

```bash
npm run dev
```

## 2. Chạy server Express

```bash
cd server
npm install
npm run dev
```

- `npm run dev` — chạy bằng `nodemon`, tự restart khi sửa code (dùng khi phát triển)
- `npm start` — chạy bằng `node`, không tự restart (dùng khi chạy thật)

Sau khi chạy, server lắng nghe tại `http://localhost:4100` (có thể đổi qua biến môi trường `PORT`):

- API: `http://localhost:4100/api/...`
- Health check: `http://localhost:4100/health`
- Swagger docs: `http://localhost:4100/api-docs`

## Cấu trúc thư mục

```
study/
├── client/    # Frontend (tự tạo theo hướng dẫn ở trên)
└── server/    # Express API
    └── src/
        ├── server.js       # Entry point
        ├── swagger.js      # Cấu hình Swagger
        ├── routes/         # Các route (auth, hello, me...)
        ├── middleware/      # Middleware (auth...)
        ├── store/          # Token store
        └── data/           # Dữ liệu mẫu (users...)
```

## Ghi chú

- `node_modules` của cả `client` và `server` đã được `.gitignore` bỏ qua, mỗi lần clone/pull code mới cần chạy lại `npm install` ở từng thư mục.
