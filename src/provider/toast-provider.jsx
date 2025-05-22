
export const ToasterProvider = () => {
    return (
        <Toaster
            theme="light"
            richColors
            position="top-right"
            className="bg-neutral-100 shadow-lg"
        />
    );
};
// src/components/ToastProvider.tsx

import { Toaster } from 'sonner';

const ToastProvider = ({ children }) => {
    return (
        <div>
            {/* Toast Provider */}
            <Toaster />
            {children}
        </div>
    );
};

export default ToastProvider;
