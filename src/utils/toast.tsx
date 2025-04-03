import { toast } from "sonner";
import {
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  MessageCircle,
} from "lucide-react";
import styles from "./toast.module.scss";

type ToastType = "default" | "success" | "info" | "error" | "warn";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case "success":
      return {
        Icon: CheckCircle,
        className: "bg-green-100 text-green-900 border-green-300",
      };
    case "info":
      return {
        Icon: Info,
        className: "bg-blue-100 text-blue-900 border-blue-300",
      };
    case "error":
      return {
        Icon: XCircle,
        className: "bg-red-100 text-red-900 border-red-300",
      };
    case "warn":
      return {
        Icon: AlertTriangle,
        className: "bg-yellow-100 text-yellow-900 border-yellow-300",
      };
    default:
      return {
        Icon: MessageCircle,
        className: "bg-white text-black border-gray-300",
      };
  }
};

export function toastWithAnimation(
  message: string,
  options: ToastOptions = {},
) {
  const { type = "default", duration = 3000 } = options;
  const { Icon, className } = getToastConfig(type);

  toast.custom(
    () => (
      <div
        className={`${styles.customToast} flex items-center gap-2 px-4 py-3 rounded-xl shadow-md border text-sm font-medium ${className}`}
        style={{
          animationDelay: `0ms, ${duration - 500}ms`,
        }}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span>{message}</span>
      </div>
    ),
    { duration },
  );
}
