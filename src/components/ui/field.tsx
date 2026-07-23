"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1 text-sm font-medium leading-none select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Wraps a single form control with a visible label, optional persistent
 * helper text, and an error slot that is announced to screen readers.
 *
 * Wiring is automatic: the child input receives id, aria-describedby and
 * aria-invalid, so callers never have to hand-manage those.
 */
function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </Label>

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
            required,
          })
        : children}

      {/* Helper text persists — it is not a placeholder substitute. */}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Groups related fields with an accessible legend. */
function FieldSet({
  legend,
  description,
  className,
  children,
}: {
  legend: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="overline mb-1">{legend}</legend>
      {description && (
        <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </fieldset>
  );
}

export { Field, FieldSet, Label };
