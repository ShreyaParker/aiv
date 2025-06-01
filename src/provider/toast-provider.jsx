import { Toaster } from "sonner";

export const ToastProvider = ({ children }) => {
    return (
        <>
            <Toaster
                theme="light"
                richColors
                position="top-right"
                className="bg-neutral-100 shadow-lg"
            />
            {children}
        </>
    );
};
