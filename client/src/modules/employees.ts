import queriesKeys from "@/consts/queriesKeys";
import employeeService, {
  RequestCreateEmployee,
  RequestUpdateEmployee,
} from "@/services/employeeService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetEmployees = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: [queriesKeys.getEmployees],
    queryFn: async () => {
      const response = await employeeService.getEmployees();
      return response.data;
    },
    enabled: options?.enabled,
  });

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RequestCreateEmployee) =>
      employeeService.createEmployee(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getEmployees] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: RequestUpdateEmployee }) =>
      employeeService.updateEmployee(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getEmployees] });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeService.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queriesKeys.getEmployees] });
    },
  });
};
