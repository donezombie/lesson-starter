import { toast } from "react-toastify";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";
import PageWrapper from "@/components/PageWrapper";
import FormikField from "@/components/customFieldsFormik/FormikField";
import InputField from "@/components/customFieldsFormik/InputField";
import { Button } from "@/components/ui/button";
import CommonIcons from "@/components/CommonIcons";
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
  const { t } = useTranslation("shared");
  const { user, isAdmin } = useAuth();
  const {
    data: requests,
    isPending,
    isFetching,
    refetch,
  } = useGetLeaveRequests();
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

  const statusLabel = (status: string) => {
    if (status === "approved") return t("leaveRequests.statusApproved");
    if (status === "rejected") return t("leaveRequests.statusRejected");
    return t("leaveRequests.statusPending");
  };

  const handleDecision = async (
    id: number,
    status: "approved" | "rejected"
  ) => {
    try {
      await updateStatus({ id, status });
      toast(t("leaveRequests.updatedToast"), { type: "success" });
    } catch (error) {
      showError(error);
    }
  };

  //! Render
  return (
    <PageWrapper>
      <div className="component:LeaveRequests w-full">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold md:text-3xl">
            {t("leaveRequests.title")}
          </h1>
          <Button
            variant="outline"
            onClick={() => refetch()}
            isLoading={isFetching}
          >
            <CommonIcons.RefreshCw className="icon" /> {t("common.refresh")}
          </Button>
        </div>

        {!isAdmin && (
          <Formik
            initialValues={{ fromDate: "", toDate: "", reason: "" }}
            validationSchema={Yup.object().shape({
              fromDate: Yup.string().required(
                t("leaveRequests.fromDateRequired")
              ),
              toDate: Yup.string().required(t("leaveRequests.toDateRequired")),
              reason: Yup.string().required(t("leaveRequests.reasonRequired")),
            })}
            onSubmit={async (values, { resetForm, setSubmitting }) => {
              try {
                await createLeaveRequest(values);
                toast(t("leaveRequests.submittedToast"), { type: "success" });
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
                    label={t("leaveRequests.fromDate")}
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="toDate"
                    type="date"
                    label={t("leaveRequests.toDate")}
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="reason"
                    label={t("leaveRequests.reason")}
                    required
                  />
                  <Button type="submit" isLoading={isSubmitting}>
                    {t("leaveRequests.submit")}
                  </Button>
                </Form>
              );
            }}
          </Formik>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>{t("leaveRequests.employee")}</TableHead>}
              <TableHead>{t("leaveRequests.fromDate")}</TableHead>
              <TableHead>{t("leaveRequests.toDate")}</TableHead>
              <TableHead>{t("leaveRequests.reason")}</TableHead>
              <TableHead>{t("leaveRequests.status")}</TableHead>
              {isAdmin && <TableHead>{t("common.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 4}>
                  {t("common.loading")}
                </TableCell>
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
                  <TableCell>{statusLabel(request.status)}</TableCell>
                  {isAdmin && (
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={request.status !== "pending"}
                        onClick={() => handleDecision(request.id, "approved")}
                      >
                        {t("leaveRequests.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={request.status !== "pending"}
                        onClick={() => handleDecision(request.id, "rejected")}
                      >
                        {t("leaveRequests.reject")}
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
