import FormikField from "@/components/customFieldsFormik/FormikField";
import InputField from "@/components/customFieldsFormik/InputField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import BaseUrl from "@/consts/baseUrl";
import { sleepTime } from "@/helpers/common";
import { useAuth } from "@/providers/AuthenticationProvider";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";
import * as Yup from "yup";

const ForgotPassword = () => {
  //! State
  const { t } = useTranslation("shared");
  const { toast } = useToast();
  const { login, isLogged } = useAuth();

  //! Render
  if (isLogged) {
    return <Navigate to={BaseUrl.Homepage} />;
  }

  return (
    <div className="component:ForgotPassword flex h-[100vh] w-[100vw] items-center justify-center p-2">
      <Formik
        validationSchema={Yup.object().shape({
          username: Yup.string().required(t("forgotPassword.usernameRequired")),
          password: Yup.string().required(t("forgotPassword.passwordRequired")),
        })}
        initialValues={{
          username: "",
          password: "",
        }}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            setSubmitting(true);
            const { username, password } = values;
            await sleepTime(1000);
            login({ username, password });
          } catch (error) {
            toast({
              variant: "destructive",
              description: error as string,
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting }) => {
          return (
            <Form className="min-w-[500px]">
              <Card className="shadow-md">
                <CardHeader className="pb-5">
                  <h1 className="text-xl font-semibold tracking-tight">
                    {t("forgotPassword.title")}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("forgotPassword.subtitle1")}
                    <br />
                    {t("forgotPassword.subtitle2")}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <FormikField
                    component={InputField}
                    name="email"
                    label={t("forgotPassword.email")}
                    placeholder="your-email@gmail.com"
                    required
                  />

                  <Button type="submit" isLoading={isSubmitting}>
                    {t("forgotPassword.continue")}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    {t("forgotPassword.haveAccount")}{" "}
                    <Link to={BaseUrl.Login} className="is-link">
                      {t("forgotPassword.logIn")}
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default ForgotPassword;
