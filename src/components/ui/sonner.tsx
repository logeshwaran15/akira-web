import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      offset="76px"
      closeButton
      icons={{
        success: <CircleCheck />,
        error: <TriangleAlert />,
        warning: <TriangleAlert />,
        info: <Info />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:![--width:auto] group-[.toaster]:!box-border group-[.toaster]:!flex group-[.toaster]:!w-fit group-[.toaster]:!min-w-[320px] group-[.toaster]:!max-w-[min(640px,calc(100vw-2rem))] group-[.toaster]:!min-h-[52px] group-[.toaster]:!items-stretch group-[.toaster]:!gap-0 group-[.toaster]:!overflow-hidden group-[.toaster]:!rounded-full group-[.toaster]:!border group-[.toaster]:!border-border group-[.toaster]:!bg-card group-[.toaster]:!p-0 group-[.toaster]:!text-[16px] group-[.toaster]:!font-normal group-[.toaster]:!leading-snug group-[.toaster]:!text-card-foreground group-[.toaster]:!shadow-lg group-data-[type=success]:!border-[#16a34a] group-data-[type=error]:!border-[#dc2626] group-data-[type=warning]:!border-[#f59e0b] group-data-[type=info]:!border-[#2563eb]",
          content:
            "group-[.toaster]:!min-w-0 group-[.toaster]:!flex-1 group-[.toaster]:!gap-0 group-[.toaster]:!self-center group-[.toaster]:!py-3 group-[.toaster]:!pl-5 group-[.toaster]:!pr-2",
          icon: "group-[.toaster]:!m-0 group-[.toaster]:!flex group-[.toaster]:!h-auto group-[.toaster]:!w-14 group-[.toaster]:!shrink-0 group-[.toaster]:!items-center group-[.toaster]:!justify-center bg-muted-foreground group-[.toaster]:!text-white [&_svg]:!h-6 [&_svg]:!w-6 group-data-[type=success]:!bg-[#16a34a] group-data-[type=error]:!bg-[#dc2626] group-data-[type=warning]:!bg-[#f59e0b] group-data-[type=info]:!bg-[#2563eb]",
          title: "group-[.toast]:!line-clamp-2 group-[.toast]:!break-words group-[.toast]:!text-[16px] group-[.toast]:!font-normal group-[.toast]:!leading-snug",
          description: "group-[.toast]:!text-xs group-[.toast]:!opacity-80",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toaster]:!static group-[.toaster]:!order-last group-[.toaster]:!mx-4 group-[.toaster]:!flex group-[.toaster]:!h-6 group-[.toaster]:!w-6 group-[.toaster]:!items-center group-[.toaster]:!justify-center [&_svg]:!h-4 [&_svg]:!w-4 group-[.toaster]:!shrink-0 group-[.toaster]:!self-center group-[.toaster]:![transform:none] group-[.toaster]:![translate:none] group-[.toaster]:!top-auto group-[.toaster]:!left-auto group-[.toaster]:!right-auto group-[.toaster]:!border-0 group-[.toaster]:!bg-transparent group-[.toaster]:!text-muted-foreground group-[.toaster]:!opacity-100 hover:group-[.toaster]:!text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
