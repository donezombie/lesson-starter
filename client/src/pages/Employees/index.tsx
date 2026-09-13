import { useState } from "react";
import { toast } from "react-toastify";
import PageWrapper from "@/components/PageWrapper";
import DialogConfirm from "@/components/dialogs/DialogConfirm";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useToggleDialog from "@/hooks/useToggleDialog";
import { UserInfo } from "@/interfaces/user";
import { showError } from "@/helpers/toast";
import {
  useCreateEmployee,
  useDeleteEmployee,
  useGetEmployees,
  useUpdateEmployee,
} from "@/modules/employees";
import EmployeeFormDialog, {
  EmployeeFormValues,
} from "./EmployeeFormDialog";

const Employees = () => {
  //! State
  const [openForm, toggleForm, shouldRenderForm] = useToggleDialog();
  const [openConfirm, toggleConfirm, shouldRenderConfirm] = useToggleDialog();
  const [selectedEmployee, setSelectedEmployee] = useState<UserInfo | null>(
    null
  );

  const { data: employees, isPending } = useGetEmployees({ enabled: true });
  const { mutateAsync: createEmployee } = useCreateEmployee();
  const { mutateAsync: updateEmployee } = useUpdateEmployee();
  const { mutateAsync: deleteEmployee } = useDeleteEmployee();

  //! Function
  const handleOpenCreate = () => {
    setSelectedEmployee(null);
    toggleForm();
  };

  const handleOpenEdit = (employee: UserInfo) => {
    setSelectedEmployee(employee);
    toggleForm();
  };

  const handleOpenDelete = (employee: UserInfo) => {
    setSelectedEmployee(employee);
    toggleConfirm();
  };

  const handleSubmitForm = async (values: EmployeeFormValues) => {
    try {
      const body = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        position: values.position,
        department: values.department,
        role: (values.role?.value || "employee") as "admin" | "employee",
        joinDate: values.joinDate,
      };

      if (selectedEmployee) {
        await updateEmployee({ id: selectedEmployee.id, body });
      } else {
        await createEmployee({
          ...body,
          username: values.username,
          password: values.password,
        });
      }

      toast("Saved successfully!", { type: "success" });
      toggleForm();
    } catch (error) {
      showError(error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;

    try {
      await deleteEmployee(selectedEmployee.id);
      toast("Deleted successfully!", { type: "success" });
      toggleConfirm();
    } catch (error) {
      showError(error);
    }
  };

  //! Render
  return (
    <PageWrapper>
      <div className="component:Employees w-full">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold md:text-3xl">Employees</h1>
          <Button onClick={handleOpenCreate}>Add employee</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            )}
            {(employees || []).map((employee) => {
              return (
                <TableRow key={employee.id}>
                  <TableCell>{employee.username}</TableCell>
                  <TableCell>{employee.fullName}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenEdit(employee)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleOpenDelete(employee)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {shouldRenderForm && (
        <EmployeeFormDialog
          isOpen={openForm}
          toggle={toggleForm}
          employee={selectedEmployee}
          onSubmit={handleSubmitForm}
        />
      )}

      {shouldRenderConfirm && (
        <DialogConfirm
          isOpen={openConfirm}
          toggle={toggleConfirm}
          title="Delete employee"
          content={`Are you sure you want to delete "${selectedEmployee?.fullName}"?`}
          onSubmit={handleConfirmDelete}
        />
      )}
    </PageWrapper>
  );
};

export default Employees;
