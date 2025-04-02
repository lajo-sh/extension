import * as React from "react";
import { type LectureElement, TextElement, ImageElement } from "../lectures";

export function RenderLectureElement(props: {
  lectureElement: LectureElement;
}) {
  if (props.lectureElement instanceof TextElement) {
    return (
      <p className="text-base leading-7 text-muted-foreground">
        {props.lectureElement.text}
      </p>
    );
  }

  if (props.lectureElement instanceof ImageElement) {
    return (
      <div className="my-8">
        <img
          src={props.lectureElement.imageUrl}
          alt=""
          className="rounded-lg max-h-[20vh] object-contain mx-auto shadow-sm"
        />
      </div>
    );
  }
  return null;
}
