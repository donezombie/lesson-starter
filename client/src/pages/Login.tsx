import CommonIcons from "@/components/CommonIcons";
import FormikField from "@/components/customFieldsFormik/FormikField";
import InputField from "@/components/customFieldsFormik/InputField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import BaseUrl from "@/consts/baseUrl";
import { useAuth } from "@/providers/AuthenticationProvider";
import { Form, Formik } from "formik";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";
import * as Yup from "yup";

const Login = () => {
  //! State
  const { t } = useTranslation("shared");
  const { toast } = useToast();
  const { login, isLogged } = useAuth();

  //! Render
  if (isLogged) {
    return <Navigate to={BaseUrl.Homepage} />;
  }

  return (
    <div className="component:Login flex h-[100vh] w-[100vw] items-center justify-center p-2">
      <Formik
        validationSchema={Yup.object().shape({
          username: Yup.string().required(t("login.usernameRequired")),
          password: Yup.string().required(t("login.passwordRequired")),
        })}
        initialValues={{
          username: "",
          password: "",
        }}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            setSubmitting(true);
            const { username, password } = values;
            await login({ username, password });
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
              <div className="mb-8 flex justify-center text-3xl font-bold">
                Logo here
              </div>
              <Card className="shadow-md">
                <CardHeader className="pb-5">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {t("login.title")}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("login.subtitle1")}
                    <br />
                    {t("login.subtitle2")}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <FormikField
                    component={InputField}
                    name="username"
                    label={t("login.username")}
                    placeholder={t("login.usernamePlaceholder")}
                    required
                  />

                  <FormikField
                    component={InputField}
                    name="password"
                    type="password"
                    label={t("login.password")}
                    placeholder={t("login.passwordPlaceholder")}
                    required
                  />

                  <Link
                    to={BaseUrl.ForgotPassword}
                    className="is-link text-right text-sm text-muted-foreground"
                  >
                    {t("login.forgotPassword")}
                  </Link>

                  <Button type="submit" isLoading={isSubmitting}>
                    <CommonIcons.LogIn className="icon" /> {t("common.login")}
                  </Button>
                </CardContent>
              </Card>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default Login;
