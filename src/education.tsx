import * as React from "react";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { useLectures } from "./hooks/useLectures";

function AboutEducationalMode() {
  const texts = [
    { title: "Dobrodošli", text: "Dobrodošli u edukativni mod!" },
    {
      title: "",
      text: "Ovdje možete naučiti kada prepoznati phishing stranice",
    },
  ];
  const [currentText, setCurrentText] = useState(0);

  useEffect(() => {
    if (currentText === texts.length - 1) {
      chrome.storage.local.set({ educationModeIntroFinished: true });
    }
  }, [currentText]);

  return (
    <div className="h-full w-full flex flex-col gap-16 items-center justify-center">
      <div className="text-center flex flex-col gap-2">
        <div className="font-bold text-3xl">{texts[currentText].title}</div>

        <div className="text-center text-lg">{texts[currentText].text}</div>
      </div>

      <button
        type="button"
        className="bg-primary px-16 py-4 rounded-lg"
        onClick={() => setCurrentText((currentText + 1) % texts.length)}
      >
        {chrome.i18n.getMessage("next")}
      </button>
    </div>
  );
}

function Lectures() {
  const lectures = useLectures();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Edukativne lekcije
      </h1>
      <div className="space-y-4">
        {lectures.map((lecture) => (
          <a
            href={chrome.runtime.getURL(`/pages/lecture.html?id=${lecture.id}`)}
            key={lecture.id}
            type="button"
            className="bg-card p-4 text-xl rounded-lg shadow-md flex gap-4 justify-between items-center cursor-pointer hover:bg-muted transition-colors w-full text-left"
            aria-label={`Lekcija: ${lecture.title}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded-full ${lecture.completed ? "bg-green-500" : "bg-gray-300"}`}
              />

              <h3 className="font-medium">{lecture.title}</h3>
            </div>

            <span className="text-sm text-muted-foreground">
              {lecture.completed ? "Završeno" : "Nije završeno"}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [showEducationalMode, setShowEducationalMode] = useState(false);

  useEffect(() => {
    chrome.storage.local.get("educationModeIntroFinished", (result) => {
      setShowEducationalMode(!result.educationModeIntroFinished);
    });
  }, []);

  return (
    <div className="bg-background text-foreground h-screen w-screen flex overflow-hidden">
      {showEducationalMode ? <AboutEducationalMode /> : <Lectures />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
