import { cn } from "@/lib/utils";
import { useSidebarHandler } from "@/providers/SidebarProvider";
import { useAuth } from "@/providers/AuthenticationProvider";
import BaseUrl from "@/consts/baseUrl";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Sidebar = ({ forMobile }: { forMobile?: boolean }) => {
  const { t } = useTranslation("shared");
  const location = useLocation();
  const { isOpen } = useSidebarHandler();
  const { isAdmin } = useAuth();

  const menuItems = [
    { label: t("sidebar.dashboard"), href: BaseUrl.Homepage },
    { label: t("sidebar.attendance"), href: BaseUrl.Attendance },
    { label: t("sidebar.leaveRequests"), href: BaseUrl.LeaveRequests },
    ...(isAdmin ? [{ label: t("sidebar.employees"), href: BaseUrl.Employees }] : []),
  ];

  return (
    <div
      className={cn(
        "component:Sidebar",
        forMobile
          ? isOpen
            ? "block h-[100vh] w-[100vw] overflow-auto"
            : "hidden h-[100vh] w-[100vw] overflow-auto"
          : "sticky top-0 hidden h-[100vh] max-h-[100vh] w-[--sidebar-width] p-2 md:block"
      )}
    >
      <div className="flex h-full w-full flex-col rounded-md border bg-card p-1 shadow-md">
        <div className="side-bar__logo px-2 pt-2">
          <h3 className="text-xl">HRM</h3>
        </div>

        <div className="side-bar__menu mt-8">
          <h6 className="mb-2 px-3 text-sm text-muted-foreground">
            {t("sidebar.general")}
          </h6>
          {menuItems.map((el) => {
            return (
              <Link
                key={el.label}
                to={el.href}
                className={cn(
                  "side-bar__menu__item flex items-center gap-2 px-3 py-2 text-sm",
                  location.pathname === el.href && "is-active"
                )}
              >
                {el.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
