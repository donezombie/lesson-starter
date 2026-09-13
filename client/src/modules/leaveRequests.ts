import queriesKeys from "@/consts/queriesKeys";
import leaveRequestService, {
  RequestCreateLeaveRequest,
} from "@/services/leaveRequestService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetLeaveRequests = () =>
  useQuery({
    queryKey: [queriesKeys.getLeaveRequests],
    queryFn: async () => {
      const response = await leaveRequestService.getLeaveRequests();
      return response.data;
    },
  });

export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestCreateLeaveRequest) =>
      leaveRequestService.createLeaveRequest(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queriesKeys.getLeaveRequests],
      });
    },
  });
};

export const useUpdateLeaveRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: "approved" | "rejected";
    }) => leaveRequestService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queriesKeys.getLeaveRequests],
      });
    },
  });
};
