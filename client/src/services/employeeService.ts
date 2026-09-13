import { AxiosRequestConfig } from "axios";
import httpService from "./httpService";
import { PromiseResponseBase } from "@/interfaces/common";
import { UserInfo } from "@/interfaces/user";

export interface RequestCreateEmployee {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  role: "admin" | "employee";
  joinDate?: string;
}

export interface RequestUpdateEmployee {
  fullName?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  role?: "admin" | "employee";
  joinDate?: string;
}

class EmployeeService {
  getEmployees(configs?: AxiosRequestConfig): PromiseResponseBase<UserInfo[]> {
    return httpService.get(`/api/employees`, configs);
  }

  createEmployee(body: RequestCreateEmployee): PromiseResponseBase<UserInfo> {
    return httpService.post(`/api/employees`, body);
  }

  updateEmployee(
    id: number,
    body: RequestUpdateEmployee
  ): PromiseResponseBase<UserInfo> {
    return httpService.put(`/api/employees/${id}`, body);
  }

  deleteEmployee(id: number): PromiseResponseBase<void> {
    return httpService.delete(`/api/employees/${id}`);
  }
}

export default new EmployeeService();
