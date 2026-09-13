export interface UserInfo {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: "admin" | "employee";
  joinDate: string;
}
