import { Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FormFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "email" | "tel";
export type FormFieldOption = { label: string; value: string };
export type FormValues = Record<string, unknown>;

export type FormFieldSchema = {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: FormFieldOption[];
  placeholder?: string;
  colSpan?: 1 | 2 | 3;
  section?: string;
  /** Hide (and skip validating) this field unless the predicate is true. */
  visibleIf?: (values: FormValues) => boolean;
  /** Override required-ness dynamically, e.g. Stream mandatory only for Class XI. */
  requiredIf?: (values: FormValues) => boolean;
  helpText?: string;
};

/**
 * Validates a schema against a values object. Returns a map of
 * field name -> error message for every required field that's
 * empty (and currently visible).
 */
export function validateFormSchema(schema: FormFieldSchema[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of schema) {
    if (field.visibleIf && !field.visibleIf(values)) continue;
    const isRequired = field.requiredIf ? field.requiredIf(values) : field.required;
    if (!isRequired) continue;
    const v = values[field.name];
    if (v === undefined || v === null || v === "") {
      errors[field.name] = `${field.label} is required.`;
    }
  }
  return errors;
}

function groupBySection(schema: FormFieldSchema[]) {
  const order: string[] = [];
  const groups: Record<string, FormFieldSchema[]> = {};
  for (const field of schema) {
    const key = field.section ?? "";
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(field);
  }
  return order.map((key) => ({ section: key, fields: groups[key] }));
}

export function FormEngine({
  schema,
  values,
  onChange,
  errors,
}: {
  schema: FormFieldSchema[];
  values: FormValues;
  onChange: (name: string, value: unknown) => void;
  errors?: Record<string, string>;
}) {
  const groups = groupBySection(schema);

  return (
    <div className="space-y-6">
      {groups.map(({ section, fields }) => {
        const visibleFields = fields.filter((f) => !f.visibleIf || f.visibleIf(values));
        if (visibleFields.length === 0) return null;

        return (
          <Fragment key={section || "_default"}>
            {section && <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{section}</h3>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleFields.map((field) => {
                const isRequired = field.requiredIf ? field.requiredIf(values) : field.required;
                const value = values[field.name];
                const error = errors?.[field.name];
                const span = field.colSpan === 3 ? "sm:col-span-2" : field.colSpan === 2 ? "sm:col-span-2" : "";

                return (
                  <div key={field.name} className={cn("space-y-1.5", span)}>
                    {field.type !== "checkbox" && <Label required={isRequired}>{field.label}</Label>}

                    {field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "number" ? (
                      <Input
                        type={field.type === "text" ? "text" : field.type}
                        value={(value as string | number | undefined) ?? ""}
                        onChange={(e) => onChange(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className="rounded-md"
                      />
                    ) : field.type === "textarea" ? (
                      <Textarea
                        value={(value as string) ?? ""}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="rounded-md"
                        rows={3}
                      />
                    ) : field.type === "date" ? (
                      <DatePicker value={(value as string) ?? ""} onChange={(v) => onChange(field.name, v)} placeholder={field.placeholder} />
                    ) : field.type === "select" ? (
                      <Select value={(value as string) || "none"} onValueChange={(v) => onChange(field.name, v === "none" ? "" : v)}>
                        <SelectTrigger className="rounded-md"><SelectValue placeholder={field.placeholder ?? "Choose"} /></SelectTrigger>
                        <SelectContent>
                          {!isRequired && <SelectItem value="none">None</SelectItem>}
                          {(field.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === "checkbox" ? (
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={!!value} onCheckedChange={(v) => onChange(field.name, !!v)} />
                        {field.label}
                      </label>
                    ) : null}

                    {field.helpText && !error && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </div>
                );
              })}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
