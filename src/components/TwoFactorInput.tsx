// biome-ignore lint/style/useImportType: the entirety of react needs to be imported beacuse react is weird
import * as React from "react";
import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";

interface TwoFactorInputProps {
  length?: number;
  onComplete?: (code: string) => void;
  onChange?: (code: string) => void;
  value?: string;
}

const TwoFactorInput: React.FC<TwoFactorInputProps> = ({
  length = 6,
  onComplete = () => {},
  onChange = () => {},
  value = "",
}) => {
  const isControlled = value !== undefined;

  const getInitialCode = () => {
    const valueArray = value ? value.split("").slice(0, length) : [];
    const initialArray = Array(length).fill("");
    for (let i = 0; i < valueArray.length; i++) {
      initialArray[i] = valueArray[i];
    }
    return initialArray;
  };

  const [code, setCode] = useState<string[]>(getInitialCode);
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const lastValueRef = useRef<string>(value);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  useEffect(() => {
    if (isControlled && value !== lastValueRef.current) {
      const valueArray = value.split("").slice(0, length);
      const newCode = Array(length).fill("");
      for (let i = 0; i < valueArray.length; i++) {
        newCode[i] = valueArray[i];
      }
      setCode(newCode);
      lastValueRef.current = value;
    }
  }, [value, length, isControlled]);

  useEffect(() => {
    if (isControlled) return;

    const currentCode = code.join("");
    onChange(currentCode);

    if (currentCode.length === length && !currentCode.includes("")) {
      onComplete(currentCode);
    }
  }, [code, length, onComplete, onChange, isControlled]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (!/^\d*$/.test(inputValue)) return;

    const digit = inputValue.substring(inputValue.length - 1);

    if (isControlled) {
      const newCode = [...code];
      newCode[index] = digit;
      const newValue = newCode.join("");
      onChange(newValue);

      if (digit !== "" && index < length - 1) {
        inputRefs.current[index + 1].focus();
      }
    } else {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      if (digit !== "" && index < length - 1) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (code[index] === "" && index > 0) {
        if (isControlled) {
          const newCode = [...code];
          newCode[index - 1] = "";
          onChange(newCode.join(""));
        } else {
          const newCode = [...code];
          newCode[index - 1] = "";
          setCode(newCode);
        }
        inputRefs.current[index - 1].focus();
      } else {
        if (isControlled) {
          const newCode = [...code];
          newCode[index] = "";
          onChange(newCode.join(""));
        } else {
          const newCode = [...code];
          newCode[index] = "";
          setCode(newCode);
        }
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();

    if (!/^\d+$/.test(pastedData)) return;

    const newCode = Array(length).fill("");
    for (let i = 0; i < Math.min(length, pastedData.length); i++) {
      newCode[i] = pastedData[i];
    }

    if (isControlled) {
      onChange(newCode.join(""));
    } else {
      setCode(newCode);
    }

    const nextIndex = Math.min(pastedData.length, length - 1);

    inputRefs.current[nextIndex].focus();
  };

  const displayValues = isControlled
    ? value
        .split("")
        .slice(0, length)
        .concat(Array(Math.max(0, length - value.length)).fill(""))
    : code;

  return (
    <div className="flex gap-2">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          className="w-12 h-14 rounded-lg text-center text-xl font-bold text-foreground
                    transition-colors bg-tertiary-background"
          value={displayValues[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          ref={(el) => {
            if (el) inputRefs.current[index] = el;
          }}
        />
      ))}
    </div>
  );
};

export default TwoFactorInput;
