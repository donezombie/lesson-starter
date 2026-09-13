import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import PageWrapper from "@/components/PageWrapper";
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
import { useCheckIn, useCheckOut, useGetAttendance } from "@/modules/attendance";
import { useGetEmployees } from "@/modules/employees";

const Attendance = () => {
  //! State
  const { t } = useTranslation("shared");
  const { user, isAdmin } = useAuth();
  const {
    data: records,
    isPending,
    isFetching,
    refetch,
  } = useGetAttendance();
  const { data: employees } = useGetEmployees({ enabled: isAdmin });
  const { mutateAsync: checkIn, isPending: isCheckingIn } = useCheckIn();
  const { mutateAsync: checkOut, isPending: isCheckingOut } = useCheckOut();

  //! Function
  const employeeName = (employeeId: number) => {
    if (employeeId === user?.id) return user?.fullName;
    return (
      employees?.find((employee) => employee.id === employeeId)?.fullName ||
      `#${employeeId}`
    );
  };

  const todayOpenRecord = (records || []).find(
    (record) => record.employeeId === user?.id && !record.checkOut
  );

  const handleCheckIn = async () => {
    try {
      await checkIn();
      toast(t("attendance.checkedInToast"), { type: "success" });
    } catch (error) {
      showError(error);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();
      toast(t("attendance.checkedOutToast"), { type: "success" });
    } catch (error) {
      showError(error);
    }
  };

  //! Render
  return (
    <PageWrapper>
      <div className="component:Attendance w-full">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold md:text-3xl">
            {t("attendance.title")}
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              isLoading={isFetching}
            >
              <CommonIcons.RefreshCw className="icon" /> {t("common.refresh")}
            </Button>
            <Button
              onClick={handleCheckIn}
              isLoading={isCheckingIn}
              disabled={!!todayOpenRecord || isCheckingIn}
            >
              {t("attendance.checkIn")}
            </Button>
            <Button
              variant="outline"
              onClick={handleCheckOut}
              isLoading={isCheckingOut}
              disabled={!todayOpenRecord || isCheckingOut}
            >
              {t("attendance.checkOut")}
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>{t("attendance.employee")}</TableHead>}
              <TableHead>{t("attendance.date")}</TableHead>
              <TableHead>{t("attendance.checkInTime")}</TableHead>
              <TableHead>{t("attendance.checkOutTime")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3}>
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}
            {(records || []).map((record) => {
              return (
                <TableRow key={record.id}>
                  {isAdmin && (
                    <TableCell>{employeeName(record.employeeId)}</TableCell>
                  )}
                  <TableCell>{record.date}</TableCell>
                  <TableCell>
                    {new Date(record.checkIn).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    {record.checkOut
                      ? new Date(record.checkOut).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
};

export default Attendance;
