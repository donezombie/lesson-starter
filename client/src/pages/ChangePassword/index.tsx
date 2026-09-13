import FormikField from "@/components/customFieldsFormik/FormikField";
import InputField from "@/components/customFieldsFormik/InputField";
import PageWrapper from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import * as Yup from "yup";

const ChangePassword = () => {
  const { t } = useTranslation("shared");

  return (
    <PageWrapper>
      <div className="component:ChangePassword">
        <h1 className="mb-10 text-2xl font-bold md:text-3xl">
          {t("changePassword.title")}
        </h1>
        <Formik
          initialValues={{ nextPassword: "", confirmPassword: "" }}
          validationSchema={Yup.object().shape({
            nextPassword: Yup.string().required(
              t("changePassword.newPasswordRequired")
            ),
            confirmPassword: Yup.string().required(
              t("changePassword.confirmPasswordRequired")
            ),
          })}
          onSubmit={() => {}}
        >
          {() => {
            return (
              <Form className="flex max-w-lg flex-col gap-4">
                <FormikField
                  component={InputField}
                  name="nextPassword"
                  type="password"
                  label={t("changePassword.newPassword")}
                  required
                  placeholder={t("changePassword.newPasswordPlaceholder")}
                />

                <FormikField
                  component={InputField}
                  name="confirmPassword"
                  type="password"
                  label={t("changePassword.confirmPassword")}
                  required
                  placeholder={t("changePassword.confirmPasswordPlaceholder")}
                />

                <Button type="submit">{t("changePassword.submit")}</Button>
              </Form>
            );
          }}
        </Formik>
      </div>
    </PageWrapper>
  );
};

export default ChangePassword;
