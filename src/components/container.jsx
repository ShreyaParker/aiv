import React from 'react';
import { cn } from "@/lib/utils";


export const Container = ({ children, className }) => {  // Named export
    return (
        <div className={cn("container mx-auto px-4 md:px-8 py-4 w-full", className)}>
            {children}
        </div>
    );
};
