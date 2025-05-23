import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ClerkProvider } from "@clerk/clerk-react";

import "./index.css";
import App from "./App.jsx";
import { ToasterProvider } from "./provider/toast-provider.jsx";

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key");
}

const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
                <App />
                <ToasterProvider />
            </ClerkProvider>
        </StrictMode>
    );
}
