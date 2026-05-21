import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { KeycloakProvider } from "./context/KeycloakContext";
import "./index.css";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <KeycloakProvider>
      <RouterProvider router={router} />
    </KeycloakProvider>
  </StrictMode>
);
