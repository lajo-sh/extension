import * as React from "react";
import { useState, useEffect } from "react";
import logo from "./assets/logo.png";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import axios from "axios";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    chrome.storage.local.get(["token"], async (result) => {
      if (result.token) {
        const currentTab = await chrome.tabs.getCurrent();

        await chrome.tabs.remove(currentTab!.id!);

        return;
      }
    });
  }, []);

  return (
    <div className="bg-background text-foreground h-screen w-screen flex items-center justify-center">
      <div className="bg-secondary-background p-8 px-12 flex flex-col gap-4 rounded-lg items-center">
        <img src={logo} alt="logo" className="h-14" />

        <div className="text-center text-lg">
          {chrome.i18n.getMessage("loginPageTitle")}
        </div>

        <div className="w-full flex flex-col gap-4">
          <input
            type="text"
            className="w-full h-12 bg-tertiary-background rounded-lg text-lg p-4"
            placeholder={chrome.i18n.getMessage("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full h-12 bg-tertiary-background rounded-lg text-lg p-4"
            placeholder={chrome.i18n.getMessage("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            className="w-full h-12 bg-primary rounded-lg text-lg"
            onClick={async () => {
              const { data } = await axios.post(
                `${BASE_URL}/auth/login`,
                {
                  email,
                  password,
                },
                {
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              );

              if (!data.success) {
                alert(data.error);

                return;
              }

              chrome.storage.local.set({ token: data.session }, async () => {
                const currentTab = await chrome.tabs.getCurrent();

                chrome.tabs.remove(currentTab!.id!);
              });
            }}
          >
            {chrome.i18n.getMessage("loginButton")}
          </button>

          <a href={chrome.runtime.getURL("pages/signup.html")}>
            {chrome.i18n.getMessage("noAccount")}
          </a>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
