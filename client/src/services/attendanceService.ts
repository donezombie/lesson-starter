import { AxiosRequestConfig } from "axios";
import httpService from "./httpService";
import { PromiseResponseBase } from "@/interfaces/common";
import { AttendanceRecord } from "@/interfaces/attendance";

class AttendanceService {
  checkIn(): PromiseResponseBase<AttendanceRecord> {
    return httpService.post(`/api/attendance/check-in`, {});
  }

  checkOut(): PromiseResponseBase<AttendanceRecord> {
    return httpService.post(`/api/attendance/check-out`, {});
  }

  getAttendance(
    configs?: AxiosRequestConfig
  ): PromiseResponseBase<AttendanceRecord[]> {
    return httpService.get(`/api/attendance`, configs);
  }
}

export default new AttendanceService();
