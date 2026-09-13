import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/providers/AuthenticationProvider";
import { useGetEmployees } from "@/modules/employees";
import { useGetLeaveRequests } from "@/modules/leaveRequests";
import { useGetAttendance } from "@/modules/attendance";

const Homepage = () => {
  //! State
  const { user, isAdmin } = useAuth();
  const { data: employees } = useGetEmployees({ enabled: isAdmin });
  const { data: leaveRequests } = useGetLeaveRequests();
  const { data: attendance } = useGetAttendance();

  //! Function
  const pendingLeaveRequests = (leaveRequests || []).filter(
    (request) => request.status === "pending"
  );

  const todayOpenRecord = (attendance || []).find(
    (record) => record.employeeId === user?.id && !record.checkOut
  );

  //! Render
  return (
    <PageWrapper>
      <div className="component:Homepage w-full">
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">
          Welcome, {user?.fullName}
        </h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {isAdmin && (
            <div className="rounded-md border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Total employees</p>
              <p className="text-2xl font-semibold">
                {employees?.length ?? "-"}
              </p>
            </div>
          )}

          <div className="rounded-md border p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Pending leave requests" : "Your pending requests"}
            </p>
            <p className="text-2xl font-semibold">
              {pendingLeaveRequests.length}
            </p>
          </div>

          {!isAdmin && (
            <div className="rounded-md border p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-semibold">
                {todayOpenRecord ? "Checked in" : "Not checked in"}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default Homepage;
