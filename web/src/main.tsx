import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { ConfigNeeded } from "./components/ConfigNeeded";
import { I18nProvider } from "./core/i18n";
import { isConfigured } from "./core/env";
import { AuthProvider } from "./data/useAuth";
import "./styles/theme.css";

const root = createRoot(document.getElementById("root")!);

// Without Supabase env vars the app shows a config notice instead of crashing,
// so the UI can still be reviewed (the AuthProvider needs a valid client).
root.render(
  <StrictMode>
    <I18nProvider>
      {isConfigured() ? (
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      ) : (
        <ConfigNeeded />
      )}
    </I18nProvider>
  </StrictMode>,
);
