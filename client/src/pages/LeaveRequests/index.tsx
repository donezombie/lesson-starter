import { toast } from "react-toastify";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import PageWrapper from "@/components/PageWrapper";
import FormikField from "@/components/customFieldsFormik/FormikField";
import InputField from "@/components/customFieldsFormik/InputField";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showError } from "@/helpers/toast";
import { useAuth } from "@/providers/AuthenticationProvider";
import {
  useCreateLeaveRequest,
  useGetLeaveRequests,
  useUpdateLeaveRequestStatus,
} from "@/modules/leaveRequests";
import { useGetEmployees } from "@/modules/employees";

const LeaveRequests = () => {
  //! State
  const { user, isAdmin } = useAuth();
  const { data: requests, isPending } = useGetLeaveRequests();
  const { data: employees } = useGetEmployees({ enabled: isAdmin });
  const { mutateAsync: createLeaveRequest } = useCreateLeaveRequest();
  const { mutateAsync: updateStatus } = useUpdateLeaveRequestStatus();

  //! Function
  const employeeName = (employeeId: number) => {
    if (employeeId === user?.id) return user?.fullName;
    return (
      employees?.find((employee) => employee.id === employeeId)?.fullName ||
      `#${employeeId}`
    );
  };

  const handleDecision = async (
    id: number,
    status: "approved" | "rejected"
  ) => {
    try {
      await updateStatus({ id, status });
      toast("Updated!", { type: "success" });
    } catch (error) {
      showError(error);
    }
  };

  //! Render
  return (
    <PageWrapper>
      <div className="component:LeaveRequests w-full">
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">Leave requests</h1>

        {!isAdmin && (
          <Formik
            initialValues={{ fromDate: "", toDate: "", reason: "" }}
            validationSchema={Yup.object().shape({
              fromDate: Yup.string().required("From date is required"),
              toDate: Yup.string().required("To date is required"),
              reason: Yup.string().required("Reason is required"),
            })}
            onSubmit={async (values, { resetForm, setSubmitting }) => {
              try {
                await createLeaveRequest(values);
                toast("Leave request submitted!", { type: "success" });
                resetForm();
              } catch (error) {
                showError(error);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting }) => {
              return (
                <Form className="mb-8 flex flex-col gap-3 md:max-w-lg">
                  <FormikField
                    component={InputField}
                    name="fromDate"
                    type="date"
                    label="From date"
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="toDate"
                    type="date"
                    label="To date"
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="reason"
                    label="Reason"
                    required
                  />
                  <Button type="submit" isLoading={isSubmitting}>
                    Submit request
                  </Button>
                </Form>
              );
            }}
          </Formik>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>Employee</TableHead>}
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 4}>Loading...</TableCell>
              </TableRow>
            )}
            {(requests || []).map((request) => {
              return (
                <TableRow key={request.id}>
                  {isAdmin && (
                    <TableCell>{employeeName(request.employeeId)}</TableCell>
                  )}
                  <TableCell>{request.fromDate}</TableCell>
                  <TableCell>{request.toDate}</TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{request.status}</TableCell>
                  {isAdmin && (
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={request.status !== "pending"}
                        onClick={() => handleDecision(request.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={request.status !== "pending"}
                        onClick={() => handleDecision(request.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
};

export default LeaveRequests;
