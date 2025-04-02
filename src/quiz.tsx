import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";
import "./styles/globals.css";
import type { LectureItem, Lecture, Quiz, LectureElement } from "./lectures";
import { TextElement, ImageElement } from "./lectures";
import { RenderLectureElement } from "./components/RenderLectureElement";
import { useLectures } from "./hooks/useLectures";

function FinishedDialog({
  correctAnswers,
  totalQuestions,
  open,
}: { correctAnswers: number; totalQuestions: number; open: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="bg-secondary-background text-foreground outline-none rounded-lg p-8 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[300px]"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-6">
          {chrome.i18n.getMessage("quizCompleted")}
        </h2>

        <div className="text-6xl font-bold mb-4 text-primary">
          {percentage}%
        </div>

        <p className="text-lg mb-6">
          {chrome.i18n.getMessage("correctAnswers", [
            correctAnswers.toString(),
            totalQuestions.toString(),
          ])}
        </p>

        <a
          className="bg-primary text-primary-foreground rounded-lg px-8 py-3 text-lg font-medium hover:bg-primary/80 transition-colors"
          href={chrome.runtime.getURL("/pages/education.html")}
        >
          {chrome.i18n.getMessage("backToCourses")}
        </a>
      </div>
    </dialog>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);

  const lectureId = params.get("id")!;
  const [lecture, setLecture] = useState<Lecture | null>(null);

  const [quizCompleted, setQuizCompleted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const lectures = useLectures();

  useEffect(() => {
    const lecture = lectures.find(
      (lecture) => lecture.id === Number.parseInt(lectureId),
    );
    setLecture(lecture!);
  }, [lectureId, lectures]);

  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (lecture) {
      const quiz = lecture.quiz!;

      setQuiz(quiz);
    }
  }, [lecture]);

  const handleAnswerClick = (answer: string, index: number) => {
    const nextQuestion = currentQuestion + 1;
    const question = quiz?.questions[currentQuestion];

    if (index === question?.correctAnswer) {
      alert(chrome.i18n.getMessage("correct"));

      setCorrectAnswers(correctAnswers + 1);
    } else {
      alert(chrome.i18n.getMessage("incorrect"));
    }

    if (nextQuestion < quiz?.questions.length!) {
      setCurrentQuestion(nextQuestion);
    } else {
      alert(chrome.i18n.getMessage("quizCompleted"));

      setQuizCompleted(true);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen w-screen flex items-center justify-center p-6">
      {quiz && (
        <FinishedDialog
          correctAnswers={correctAnswers}
          totalQuestions={quiz.questions.length}
          open={quizCompleted}
        />
      )}

      <div>
        <h1 className="text-4xl font-bold tracking-tight text-center">
          {quiz?.questions[currentQuestion].question}
        </h1>

        {quiz?.questions[currentQuestion].additionalElements?.map(
          (element, index: number) => {
            return (
              <RenderLectureElement key={index} lectureElement={element} />
            );
          },
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 absolute bottom-0 left-0 w-full p-4">
        {quiz?.questions[currentQuestion].answers.map((answer, index) => {
          return (
            <button
              type="button"
              key={index}
              className="bg-primary text-primary-foreground rounded-lg p-4 text-lg hover:bg-primary/80"
              onClick={() => handleAnswerClick(answer, index)}
            >
              {answer}
            </button>
          );
        })}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
