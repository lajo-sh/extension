import * as React from "react";
import { useState, useEffect } from "react";
import logo from "./assets/logo.png";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";

function App() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["token"], (result) => {
      if (!result.token) {
        chrome.tabs.create({
          url: chrome.runtime.getURL("pages/login.html"),
        });
        return;
      }
    });

    chrome.storage.local.get(["active"], (result) => {
      setActive(result.active);
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ active });
  }, [active]);

  const openDashboard = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("pages/dashboard.html"),
    });
  };

  return (
    <div className="bg-background text-foreground h-screen w-screen p-2 flex flex-col gap- relative box-border">
      <div className="flex h-10 w-full gap-2 items-center justify-between">
        <div className="flex h-10 gap-2 items-center">
          <img src={logo} alt="logo" className="h-full" />
          <div className="font-bold text-xl">
            {chrome.i18n.getMessage("extensionName")}
          </div>
        </div>
        <div className="mr-2 text-gray-400">{VERSION}</div>
      </div>

      <div className="text-xl text-center">
        {chrome.i18n.getMessage("popupProtecting")}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={openDashboard}
          className="w-full h-12 bg-secondary-background hover:bg-tertiary-background transition-colors rounded-lg text-lg"
        >
          {chrome.i18n.getMessage("openDashboard")}
        </button>

        <button
          type="button"
          className="w-full h-12 bg-primary rounded-lg text-lg"
          onClick={() => {
            setActive(!active);
          }}
        >
          {active
            ? chrome.i18n.getMessage("deactivateButton")
            : chrome.i18n.getMessage("activateButton")}
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
