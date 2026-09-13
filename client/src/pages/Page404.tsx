import React from "react";
import { useTranslation } from "react-i18next";

const Page404 = () => {
  //! State
  const { t } = useTranslation("shared");

  //! Function

  //! Render
  return (
    <div className="flex h-[100vh] w-[100vw] items-center justify-center">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] font-bold leading-tight">404</h1>
        <span className="font-medium">{t("page404.title")}</span>
        <p className="text-center text-muted-foreground">
          {t("page404.description1")} <br />
          {t("page404.description2")}
        </p>
        <div className="mt-6 flex gap-4">
          <a href="/">
            <button className="[&_svg]:size-4 inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0">
              {t("page404.backToHome")}
            </button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Page404);
