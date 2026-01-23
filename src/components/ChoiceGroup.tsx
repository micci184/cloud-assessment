"use client";

import type { Choice } from "@/lib/types";

interface ChoiceGroupProps {
  choices: Choice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function ChoiceGroup({
  choices,
  selectedId,
  onSelect,
  disabled = false,
}: ChoiceGroupProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">選択肢</legend>
      {choices.map((choice) => {
        const isSelected = selectedId === choice.id;
        return (
          <label
            key={choice.id}
            className={`
              flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all
              ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/20"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              }
              ${disabled ? "cursor-not-allowed opacity-60" : ""}
            `}
          >
            <input
              type="radio"
              name="choice"
              value={choice.id}
              checked={isSelected}
              onChange={() => onSelect(choice.id)}
              disabled={disabled}
              className="h-5 w-5 border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
            />
            <span
              className={`text-base ${
                isSelected
                  ? "font-medium text-indigo-900 dark:text-indigo-100"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {choice.text}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
