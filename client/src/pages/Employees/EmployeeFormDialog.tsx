import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import FormikField from "@/components/customFieldsFormik/FormikField";
import InputField from "@/components/customFieldsFormik/InputField";
import SelectField from "@/components/customFieldsFormik/SelectField";
import { Button } from "@/components/ui/button";
import { PermissionOptions } from "@/consts/common";
import { UserInfo } from "@/interfaces/user";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";

export interface EmployeeFormValues {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: { label: string; value: string } | null;
  joinDate: string;
}

interface EmployeeFormDialogProps {
  isOpen: boolean;
  toggle: () => void;
  employee?: UserInfo | null;
  onSubmit: (values: EmployeeFormValues) => void | Promise<any>;
}

const EmployeeFormDialog = (props: EmployeeFormDialogProps) => {
  const { t } = useTranslation("shared");
  const { isOpen, toggle, employee, onSubmit } = props;
  const isEditing = !!employee;

  const initialValues: EmployeeFormValues = {
    username: employee?.username || "",
    password: "",
    fullName: employee?.fullName || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    position: employee?.position || "",
    department: employee?.department || "",
    role: employee
      ? PermissionOptions.find((option) => option.value === employee.role) ||
        null
      : null,
    joinDate: employee?.joinDate || "",
  };

  return (
    <Dialog open={isOpen} onOpenChange={toggle}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? t("employees.dialogEditTitle")
                : t("employees.dialogAddTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? t("employees.dialogEditDesc")
                : t("employees.dialogAddDesc")}
            </DialogDescription>
          </DialogHeader>

          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={Yup.object().shape({
              username: Yup.string().required(t("employees.usernameRequired")),
              password: isEditing
                ? Yup.string()
                : Yup.string().required(t("employees.passwordRequired")),
              fullName: Yup.string().required(t("employees.fullNameRequired")),
              email: Yup.string()
                .email(t("employees.emailInvalid"))
                .required(t("employees.emailRequired")),
              role: Yup.mixed().required(t("employees.roleRequired")),
            })}
            onSubmit={onSubmit}
          >
            {({ isSubmitting }) => {
              return (
                <Form className="flex flex-col gap-3">
                  <FormikField
                    component={InputField}
                    name="username"
                    label={t("employees.username")}
                    required
                    disabled={isEditing}
                  />
                  {!isEditing && (
                    <FormikField
                      component={InputField}
                      name="password"
                      type="password"
                      label={t("employees.password")}
                      required
                    />
                  )}
                  <FormikField
                    component={InputField}
                    name="fullName"
                    label={t("employees.fullName")}
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="email"
                    label={t("employees.email")}
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="phone"
                    label={t("employees.phone")}
                  />
                  <FormikField
                    component={InputField}
                    name="position"
                    label={t("employees.position")}
                  />
                  <FormikField
                    component={InputField}
                    name="department"
                    label={t("employees.department")}
                  />
                  <FormikField
                    component={SelectField}
                    name="role"
                    label={t("employees.role")}
                    required
                    options={PermissionOptions}
                  />

                  <Button type="submit" isLoading={isSubmitting}>
                    {t("common.save")}
                  </Button>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default EmployeeFormDialog;
