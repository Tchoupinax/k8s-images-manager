type ToastSeverity = "success" | "error" | "warn";

type ToastOptions = {
  severity: ToastSeverity;
  summary: string;
  detail?: string;
  life?: number;
};

export function useAppToast() {
  const { notify } = useNotification();

  const add = (options: ToastOptions) => {
    notify({
      title: options.summary,
      text: options.detail ?? "",
      type: options.severity,
      duration: options.life ?? 3500,
    });
  };

  return { add };
}
