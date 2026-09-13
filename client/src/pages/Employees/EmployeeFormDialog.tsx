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
              {isEditing ? "Edit employee" : "Add employee"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update this employee's profile"
                : "Create a new employee account"}
            </DialogDescription>
          </DialogHeader>

          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={Yup.object().shape({
              username: Yup.string().required("Username is required"),
              password: isEditing
                ? Yup.string()
                : Yup.string().required("Password is required"),
              fullName: Yup.string().required("Full name is required"),
              email: Yup.string()
                .email("Invalid email")
                .required("Email is required"),
              role: Yup.mixed().required("Role is required"),
            })}
            onSubmit={onSubmit}
          >
            {({ isSubmitting }) => {
              return (
                <Form className="flex flex-col gap-3">
                  <FormikField
                    component={InputField}
                    name="username"
                    label="Username"
                    required
                    disabled={isEditing}
                  />
                  {!isEditing && (
                    <FormikField
                      component={InputField}
                      name="password"
                      type="password"
                      label="Password"
                      required
                    />
                  )}
                  <FormikField
                    component={InputField}
                    name="fullName"
                    label="Full name"
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="email"
                    label="Email"
                    required
                  />
                  <FormikField
                    component={InputField}
                    name="phone"
                    label="Phone"
                  />
                  <FormikField
                    component={InputField}
                    name="position"
                    label="Position"
                  />
                  <FormikField
                    component={InputField}
                    name="department"
                    label="Department"
                  />
                  <FormikField
                    component={SelectField}
                    name="role"
                    label="Role"
                    required
                    options={PermissionOptions}
                  />

                  <Button type="submit" isLoading={isSubmitting}>
                    Save
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
