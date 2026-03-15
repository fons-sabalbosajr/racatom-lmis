// utils/swal.js — SweetAlert2 wrappers for consistent alerts across the app
import Swal from "sweetalert2";

// ── Toast (auto-close notification, replaces antd message.success/error/warning/info) ──
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

export const swalMessage = {
  success: (text) => Toast.fire({ icon: "success", title: text }),
  error: (text) => Toast.fire({ icon: "error", title: text }),
  warning: (text) => Toast.fire({ icon: "warning", title: text }),
  info: (text) => Toast.fire({ icon: "info", title: text }),
};

// ── Confirm dialog (replaces antd Modal.confirm) ──
export const swalConfirm = ({
  title = "Are you sure?",
  text = "",
  icon = "warning",
  confirmButtonText = "Yes",
  cancelButtonText = "Cancel",
  confirmButtonColor = "#1677ff",
  cancelButtonColor = "#d9d9d9",
  onOk,
} = {}) => {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor,
    cancelButtonColor,
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed && onOk) return onOk();
  });
};

// ── Warning modal (replaces antd Modal.warning) ──
export const swalWarning = ({ title = "Warning", text = "", onOk } = {}) => {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    confirmButtonText: "OK",
    confirmButtonColor: "#1677ff",
  }).then((result) => {
    if (result.isConfirmed && onOk) return onOk();
  });
};

export default Swal;
