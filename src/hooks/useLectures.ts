import {
	Lecture,
	LectureItem,
	TextElement,
	ImageElement,
	Quiz,
	QuizQuestion,
} from "../lectures";
import { useEffect, useState } from "react";
import axios from "axios";

interface RawLectureElement {
	type: "text" | "image";
	text?: string;
	imageUrl?: string;
}

interface RawLectureItem {
	id: string;
	title: string;
	lectureElements: RawLectureElement[];
}

interface RawQuizQuestion {
	question: string;
	answers: string[];
	correctAnswer: string;
}

interface RawLecture {
	id: string;
	title: string;
	lectureItems: RawLectureItem[];
	quiz?: {
		questions: RawQuizQuestion[];
	};
}

export function useLectures() {
	const [lectures, setLectures] = useState<Lecture[]>([]);

	useEffect(() => {
		const fetchLectures = async () => {
			const res = await axios.get<RawLecture[]>(
				"https://raw.githubusercontent.com/lajo-sh/assets/refs/heads/main/lectures.json",
			);

			for (const lecture of res.data) {
				const lectureItems: LectureItem[] = lecture.lectureItems.map(
					(item: RawLectureItem) => {
						const lectureElements = item.lectureElements
							.map((element: RawLectureElement) => {
								if (element.type === "text" && element.text) {
									return new TextElement(element.text);
								}
								if (element.type === "image" && element.imageUrl) {
									return new ImageElement(element.imageUrl);
								}
								return null;
							})
							.filter(
								(element): element is TextElement | ImageElement =>
									element !== null,
							);

						return new LectureItem(
							Number.parseInt(item.id),
							item.title,
							lectureElements,
						);
					},
				);

				const quizQuestions: QuizQuestion[] =
					lecture.quiz?.questions.map((question: RawQuizQuestion) => {
						return new QuizQuestion(
							question.question,
							question.answers,
							Number(question.correctAnswer),
						);
					}) ?? [];

				const quiz = new Quiz(quizQuestions);

				setLectures((prev) => [
					...prev,
					new Lecture(
						Number.parseInt(lecture.id),
						lecture.title,
						lectureItems,
						quiz,
					),
				]);
			}
		};

		fetchLectures().catch(console.error);
	}, []);

	return lectures;
}
