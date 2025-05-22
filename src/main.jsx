import { StrictMode } from "react";
import { createRoot } from "react-dom/client";


import "./index.css";
import App from "./App.jsx";
import { ToasterProvider } from "./provider/toast-provider.jsx";


const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
                <App />
                <ToasterProvider />
         </StrictMode>
    );
}
