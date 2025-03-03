import * as React from "react";
import { useState } from "react";
import "./styles/globals.css";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { useAuth } from "./hooks/useAuth";

const getSteps = () => [
  {
    title: chrome.i18n.getMessage("welcomeTitle"),
    content: chrome.i18n.getMessage("welcomeContent"),
  },
  {
    title: chrome.i18n.getMessage("aboutYouTitle"),
    content: chrome.i18n.getMessage("aboutYouContent"),
  },
  {
    title: chrome.i18n.getMessage("privacyTitle"),
    content: chrome.i18n.getMessage("privacyContent"),
  },
  {
    title: chrome.i18n.getMessage("readyTitle"),
    content: chrome.i18n.getMessage("readyContent"),
  },
];

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const steps = getSteps();

  if (auth.isLoading) {
    return <div />;
  }

  const handleContinue = async () => {
    if (currentStep === 1) {
      if (!fullName.trim()) {
        alert(chrome.i18n.getMessage("enterName"));
        return;
      }

      setIsLoading(true);

      try {
        await axios.post(
          `${BASE_URL}/auth/me`,
          { fullName },
          {
            headers: {
              Authorization: `Bearer ${auth.token}`,
            },
          },
        );

        setIsLoading(false);
        setCurrentStep((prev) => prev + 1);
      } catch {
        setIsLoading(false);
        alert(chrome.i18n.getMessage("saveFailed"));
        return;
      }
      return;
    }

    if (currentStep === steps.length - 1) {
      chrome.storage.local.set({ fullName }, () => {
        chrome.tabs.getCurrent((tab) => {
          chrome.tabs.remove(tab!.id!);
        });
      });
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  return (
    <div className="bg-background text-foreground h-screen w-screen flex items-center justify-center">
      <div className="bg-secondary-background p-14 flex flex-col gap-20 rounded-lg items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <h1 className="text-3xl mb-4">{steps[currentStep].title}</h1>
            <p className="text-lg text-gray-400">
              {steps[currentStep].content}
            </p>
            {currentStep === 1 && (
              <motion.input
                type="text"
                className="mt-6 w-full h-12 bg-tertiary-background rounded-lg text-lg p-4"
                placeholder={chrome.i18n.getMessage("fullNamePlaceholder")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <motion.button
          className="w-full h-12 bg-primary rounded-lg text-lg disabled:opacity-50"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading
            ? "Saving..."
            : currentStep === steps.length - 1
              ? chrome.i18n.getMessage("finishButton")
              : chrome.i18n.getMessage("continueButton")}
        </motion.button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
