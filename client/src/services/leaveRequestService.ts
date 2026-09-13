import { AxiosRequestConfig } from "axios";
import httpService from "./httpService";
import { PromiseResponseBase } from "@/interfaces/common";
import { LeaveRequest } from "@/interfaces/leaveRequest";

export interface RequestCreateLeaveRequest {
  fromDate: string;
  toDate: string;
  reason: string;
}

class LeaveRequestService {
  getLeaveRequests(
    configs?: AxiosRequestConfig
  ): PromiseResponseBase<LeaveRequest[]> {
    return httpService.get(`/api/leave-requests`, configs);
  }

  createLeaveRequest(
    body: RequestCreateLeaveRequest
  ): PromiseResponseBase<LeaveRequest> {
    return httpService.post(`/api/leave-requests`, body);
  }

  updateStatus(
    id: number,
    status: "approved" | "rejected"
  ): PromiseResponseBase<LeaveRequest> {
    return httpService.patch(`/api/leave-requests/${id}`, { status });
  }
}

export default new LeaveRequestService();
