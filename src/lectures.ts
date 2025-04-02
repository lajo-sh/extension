import * as React from "react";

export class LectureElement {}

export class TextElement extends LectureElement {
  text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }
}

export class ImageElement extends LectureElement {
  imageUrl: string;

  constructor(imageUrl: string) {
    super();
    this.imageUrl = imageUrl;
  }
}

export class LectureItem {
  id: number;
  title: string;
  lectureElements?: LectureElement[];

  constructor(id: number, title: string, lectureElements?: LectureElement[]) {
    this.lectureElements = lectureElements;
    this.id = id;
    this.title = title;
  }
}

export class Lecture {
  id: number;
  title: string;
  completed?: boolean;
  lectureItems?: LectureItem[];
  quiz?: Quiz;

  constructor(
    id: number,
    title: string,
    lectureItems?: LectureItem[],
    quiz?: Quiz,
  ) {
    this.lectureItems = lectureItems;
    this.id = id;
    this.title = title;
    this.quiz = quiz;

    chrome.storage.local.get([`lectures-completed-${id}`], (result) => {
      this.completed = result[`lectures-completed-${id}`];
    });
  }
}

export class QuizQuestion {
  question: string;
  answers: string[];
  correctAnswer: number;
  additionalElements?: LectureElement[];

  constructor(
    question: string,
    answers: string[],
    correctAnswer: number,
    additionalElements?: LectureElement[],
  ) {
    this.question = question;
    this.answers = answers;
    this.correctAnswer = correctAnswer;
    this.additionalElements = additionalElements || [];
  }
}

export class Quiz {
  questions: QuizQuestion[];

  constructor(questions: QuizQuestion[]) {
    this.questions = questions;
  }
}
