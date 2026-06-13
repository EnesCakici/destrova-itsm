import "./i18n";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { KeycloakProvider } from "./context/KeycloakContext";
import SessionLoadingScreen from "./components/shared/SessionLoadingScreen";
import "./index.css";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <KeycloakProvider>
      <Suspense fallback={<SessionLoadingScreen />}>
        <RouterProvider router={router} />
      </Suspense>
    </KeycloakProvider>
  </StrictMode>
);
