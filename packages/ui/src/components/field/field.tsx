import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import "./field.css";

function join(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type InputProps = {
  className?: string;
  ref?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export function Input({ className = "", ref, ...rest }: InputProps) {
  return <input ref={ref} className={join("ss-input", className)} {...rest} />;
}

export type SelectProps = {
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLSelectElement>;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children">;

export function Select({
  className = "",
  children,
  ref,
  ...rest
}: SelectProps) {
  return (
    <select ref={ref} className={join("ss-select", className)} {...rest}>
      {children}
    </select>
  );
}

export type TextareaProps = {
  className?: string;
  ref?: Ref<HTMLTextAreaElement>;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function Textarea({ className = "", ref, ...rest }: TextareaProps) {
  return (
    <textarea ref={ref} className={join("ss-textarea", className)} {...rest} />
  );
}

export type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + optional hint/error — presentational only. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  className = "",
  children,
}: FieldProps) {
  return (
    <div className={join("ss-field", className)}>
      {label != null ? (
        <label className="ss-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {error != null ? (
        <p className="ss-field__error" role="alert">
          {error}
        </p>
      ) : hint != null ? (
        <p className="ss-field__hint">{hint}</p>
      ) : null}
    </div>
  );
}
