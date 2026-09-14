"use client";
import { useId } from "react";
import { today } from "../constants";
export function Field({
  label,
  name,
  type = "text",
  value,
  required = true,
  step,
  help,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string;
  required?: boolean;
  step?: string;
  help?: string;
  onChange?: (v: string) => void;
}) {
  const hintId = useId();
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        aria-describedby={help ? hintId : undefined}
        name={name}
        type={type}
        required={required}
        defaultValue={onChange ? undefined : value}
        value={onChange ? value : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        step={step}
        max={type === "date" ? today() : undefined}
        autoComplete={
          name === "email"
            ? "email"
            : name === "new_password"
              ? "new-password"
              : name.includes("password")
                ? "current-password"
                : "off"
        }
      />
      {help && <small id={hintId}>{help}</small>}
    </label>
  );
}
