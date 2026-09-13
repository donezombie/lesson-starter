import { isString } from "lodash";
import { toast, ToastOptions } from "react-toastify";

export const showSuccess = (msg: any, options?: ToastOptions) => {
  if (isString(msg)) {
    toast.success(msg, options);
    return;
  }

  toast.success("Error default");
};

const DEFAULT_ERROR_MESSAGE = "Something went wrong";

export const showError = (error: any, options?: ToastOptions) => {
  let message: unknown;

  if (isString(error)) {
    message = error;
  } else if (error?.response?.data?.message) {
    // Real backend shape: this repo's Express API always returns `{ message }`.
    message = error.response.data.message;
  } else if (error?.response?.data?.errors) {
    // Fallback for a legacy/other backend shape that might still send this.
    message = error.response.data.errors;
  } else if (error?.response?.data?.title) {
    // Fallback for a legacy/other backend shape that might still send this.
    message = error.response.data.title;
  } else if (error?.message) {
    message = error.message;
  }

  if (!isString(message)) {
    try {
      message = message ? JSON.stringify(message) : undefined;
    } catch {
      message = undefined;
    }
  }

  if (!message) {
    message = DEFAULT_ERROR_MESSAGE;
  }

  // Never pass anything but a string to toast.error, otherwise react-toastify
  // can try to render a raw object/error as a React child and crash the app.
  toast.error(String(message), options);
};
