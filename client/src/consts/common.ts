export const LANG_ENUM = {
  vi: 'vi',
  en: 'en',
};

export enum PERMISSION_ENUM {
  PUBLIC = 'PUBLIC',
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

export const PermissionOptions = Object.entries(PERMISSION_ENUM)
  .filter((el) => {
    const [, value] = el;
    return value !== PERMISSION_ENUM.PUBLIC;
  })
  .map((el) => {
    const [key, value] = el;
    return {
      label: key,
      value: value,
    };
  });

export const NUMBER_DEFAULT_ROW_PER_PAGE = 5;
export const NUMBER_DEFAULT_PAGE = 0;
