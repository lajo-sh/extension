import * as React from "react";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "./styles/globals.css";
import type { LectureItem, Lecture } from "./lectures";
import { TextElement, ImageElement } from "./lectures";
import { useLectures } from "./hooks/useLectures";

function RenderLectureItem(props: {
	lectureItem: LectureItem;
}) {
	if (!props.lectureItem) {
		return <div>Loading...</div>;
	}

	return (
		<div className="flex flex-col gap-8 w-full max-w-3xl items-center justify-center">
			<h2 className="text-3xl font-semibold tracking-tight">
				{props.lectureItem.title}
			</h2>

			{props.lectureItem.lectureElements?.map((element, index: number) => {
				if (element instanceof TextElement) {
					return (
						<p
							key={index}
							className="text-base leading-7 text-muted-foreground"
						>
							{element.text}
						</p>
					);
				}

				if (element instanceof ImageElement) {
					return (
						<div key={index} className="my-8">
							<img
								src={element.imageUrl}
								alt=""
								className="rounded-lg max-h-[20vh] object-contain mx-auto shadow-sm"
							/>
						</div>
					);
				}
				return null;
			})}
		</div>
	);
}

function App() {
	const params = new URLSearchParams(window.location.search);

	const lectureId = params.get("id")!;
	const [lecture, setLecture] = useState<Lecture | null>(null);

	const lectures = useLectures();

	useEffect(() => {
		const lecture = lectures.find(
			(lecture) => lecture.id === Number.parseInt(lectureId),
		);

		console.log(lectureId);

		setLecture(lecture || null);
	}, [lectureId, lectures]);

	const [lectureItems, setLectureItems] = useState<LectureItem[]>([]);

	useEffect(() => {
		if (lecture) {
			setLectureItems(lecture.lectureItems!);
		}
	}, [lecture]);

	const [currentLectureItem, setCurrentLectureItem] = useState(0);

	const handleNext = () => {
		if (currentLectureItem < lectureItems.length - 1) {
			setCurrentLectureItem(currentLectureItem + 1);

			return;
		}

		window.location.href = chrome.runtime.getURL(
			`/pages/quiz.html?id=${lectureId}`,
		);
	};

	const handleBack = () => {
		if (currentLectureItem > 0) {
			setCurrentLectureItem(currentLectureItem - 1);
		}
	};

	if (!lecture || !lectureItems.length) {
		return <div className="text-red-500">Lecture not found</div>;
	}

	return (
		<div className="bg-background text-foreground min-h-screen w-screen flex items-center justify-center p-6">
			{lectureItems[currentLectureItem] && (
				<div className="flex flex-col items-center gap-8 w-full">
					<RenderLectureItem lectureItem={lectureItems[currentLectureItem]} />

					<div className="flex gap-2">
						<button
							type="button"
							className="bg-primary text-primary-foreground px-6 py-3 rounded-lg transition-opacity font-semibold w-48"
							onClick={handleBack}
						>
							{chrome.i18n.getMessage("back")}
						</button>

						<button
							type="button"
							className="bg-primary text-primary-foreground px-6 py-3 rounded-lg transition-opacity font-semibold w-48"
							onClick={handleNext}
						>
							{chrome.i18n.getMessage("next")}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

createRoot(document.getElementById("root")!).render(<App />);
