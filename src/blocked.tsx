import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import { motion, AnimatePresence } from "motion/react";
import { FaPaw } from "react-icons/fa6";
import { getDomainAndSubdomain } from "./lib/getDomainAndSubdomain";

import logo from "./assets/logo.png";
import "./styles/globals.css";
import TwoFactorInput from "./components/TwoFactorInput";
import axios from "axios";

async function translateToCroatian(text: string) {
  const res = await axios.get(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=hr&dt=t&dt=bd&dj=1&q=${text}`,
  );

  const translatedText = res.data.sentences.map(
    (sentence: {
      trans: string;
    }) => sentence.trans,
  );

  console.log(translatedText);

  return translatedText.join(" ");
}

function App() {
  const [code, setCode] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isCroatian, setIsCroatian] = useState(false);

  useEffect(() => {
    chrome.i18n.getAcceptLanguages((languages) => {
      setIsCroatian(languages.includes("hr"));
    });
  }, []);

  const params = new URLSearchParams(window.location.search);

  const correctCode = params.get("code")!;
  const url = params.get("url")!;
  const explanation = params.get("explanation");

  const [translatedExplanation, setTranslatedExplanation] = useState("");

  useEffect(() => {
    if (explanation) {
      translateToCroatian(explanation).then(setTranslatedExplanation);
    }
  }, [explanation]);

  useEffect(() => {
    if (!correctCode || code.length !== 6) {
      return;
    }

    const decoded = atob(correctCode);

    console.log(decoded);

    if (code === decoded) {
      const currentTabId = chrome.tabs.getCurrent((tab) => {
        chrome.storage.session.set({
          [`whitelist-${getDomainAndSubdomain(url)}`]: true,
        });

        chrome.tabs.update(tab!.id!, {
          url: url,
        });
      });
    } else if (code.length === 6) {
      alert(chrome.i18n.getMessage("incorrectCode"));
    }
  }, [code, correctCode, url]);

  const handleContinue = () => {
    chrome.tabs.getCurrent((tab) => {
      chrome.storage.session.set({
        [`whitelist-${getDomainAndSubdomain(url)}`]: true,
      });

      chrome.tabs.update(tab!.id!, {
        url: url,
      });
    });
  };

  return (
    <main className="h-screen w-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col gap-4 bg-transparent">
        <div className="rounded-lg p-8 bg-secondary-background max-w-96 gap-6 flex flex-col items-center">
          <FaPaw className="text-primary text-7xl" />

          <div className="flex flex-col gap-4">
            <div className="text-3xl font-bold text-white text-center">
              <span className="text-red-500">STOP!</span>{" "}
              {chrome.i18n.getMessage("phishingDetected")}
            </div>

            <div className="text-gray-300 text-sm text-center leading-relaxed">
              {chrome.i18n.getMessage("phishingWarning")}
            </div>

            {translatedExplanation && (
              <div className="bg-primary/20 p-4 rounded-md border border-primary/30">
                <div className="text-white font-bold mb-1">
                  {chrome.i18n.getMessage("whySiteBlocked")}
                </div>
                <div className="text-gray-300 text-sm">
                  {isCroatian ? translatedExplanation : explanation}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <span>{chrome.i18n.getMessage("advancedOptions")}</span>
              {showAdvanced ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.1, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {correctCode ? (
                    <div className="flex flex-col gap-4">
                      <div className="text-gray-300 text-center leading-relaxed">
                        {chrome.i18n.getMessage("enterCode")}
                      </div>

                      <TwoFactorInput value={code} onChange={setCode} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full h-12 bg-primary rounded-lg text-lg text-white"
                      onClick={handleContinue}
                    >
                      {chrome.i18n.getMessage("continueAnyway")}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="absolute left-4 top-4 text-white flex text-xl gap-2 items-center">
        <img src={logo} className="h-16" alt="Logo" />

        <div className="flex flex-col">
          <div className="font-bold">
            {chrome.i18n.getMessage("extensionName")}
          </div>
          <div>{chrome.i18n.getMessage("protectedBy")}</div>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
