import queriesKeys from "@/consts/queriesKeys";
import attendanceService from "@/services/attendanceService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetAttendance = () =>
  useQuery({
    queryKey: [queriesKeys.getAttendance],
    queryFn: async () => {
      const response = await attendanceService.getAttendance();
      return response.data;
    },
  });

export const useCheckIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceService.checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getAttendance] });
    },
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attendanceService.checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getAttendance] });
    },
  });
};
