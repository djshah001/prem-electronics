import { toast } from "sonner";

export interface ParsedApiError {
  /** Summary title suitable for toast header or alert box */
  title: string;
  /** Detailed multi-line or single-line description of the specific errors */
  description?: string;
  /** Clean single-line or combined message suitable for inline text or logs */
  message: string;
  /** Map of field name -> error message, for inline form input highlighting */
  fieldErrors: Record<string, string>;
  /** Ordered list of individual human-readable error messages */
  errorList: string[];
}

const FIELD_LABELS: Record<string, string> = {
  internalName: "Internal name",
  placement: "Placement",
  contentMode: "Content mode",
  desktopAssetId: "Desktop image",
  mobileAssetId: "Mobile image",
  desktopAltText: "Desktop image alt text",
  mobileAltText: "Mobile image alt text",
  accessibleLinkLabel: "Accessible link label",
  eyebrow: "Eyebrow",
  headline: "Headline",
  description: "Description",
  primaryCtaLabel: "CTA button label",
  primaryCtaUrl: "CTA button URL",
  bannerLinkUrl: "Banner link URL",
  openInNewTab: "Open in new tab",
  textAlignment: "Text alignment",
  desktopContentPosition: "Desktop content position",
  mobileContentPosition: "Mobile content position",
  textTheme: "Text theme",
  fontFamily: "Typography / Font",
  overlayStrength: "Overlay strength",
  desktopFocalX: "Desktop focal point X",
  desktopFocalY: "Desktop focal point Y",
  mobileFocalX: "Mobile focal point X",
  mobileFocalY: "Mobile focal point Y",
  isActive: "Active status",
  startsAt: "Start date/time",
  endsAt: "End date/time",
  expectedVersion: "Version",
};

export function formatFieldName(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Parses any backend error response (Zod validation, Multer upload, Postgres constraint,
 * or custom AppError) into a user-friendly, structured error representation.
 */
export function parseApiError(
  error: unknown,
  fallback = "The operation failed.",
): ParsedApiError {
  const fieldErrors: Record<string, string> = {};
  const errorList: string[] = [];

  const errObj = error && typeof error === "object" ? (error as Record<string, any>) : null;
  const rawErrors = errObj?.errors ?? errObj?.details;

  if (Array.isArray(rawErrors)) {
    for (const item of rawErrors) {
      if (typeof item === "string") {
        errorList.push(item);
      } else if (item && typeof item === "object") {
        const field = item.field || item.path || "";
        const msg = item.message || item.error || "";
        if (field && msg) {
          fieldErrors[field] = msg;
          errorList.push(`${formatFieldName(field)}: ${msg}`);
        } else if (msg) {
          errorList.push(msg);
        }
      }
    }
  } else if (rawErrors && typeof rawErrors === "object") {
    if (rawErrors.fieldErrors && typeof rawErrors.fieldErrors === "object") {
      for (const [field, msgs] of Object.entries(rawErrors.fieldErrors)) {
        const msgList = Array.isArray(msgs) ? msgs : [String(msgs)];
        const combinedMsg = msgList.join(", ");
        fieldErrors[field] = combinedMsg;
        errorList.push(`${formatFieldName(field)}: ${combinedMsg}`);
      }
    }
    if (Array.isArray(rawErrors.formErrors)) {
      for (const msg of rawErrors.formErrors) {
        if (typeof msg === "string") errorList.push(msg);
      }
    }
  }

  // PostgreSQL constraint detail (e.g. "Key (internal_name)=(...) already exists.")
  if (errObj?.detail && typeof errObj.detail === "string") {
    errorList.push(errObj.detail);
  }

  const rawMessage = (errObj?.message || errObj?.error || (typeof error === "string" ? error : "")) as string;
  const isGenericValidation =
    !rawMessage ||
    rawMessage.toLowerCase().trim() === "validation failed" ||
    rawMessage.toLowerCase().trim() === "bad request";

  let title = fallback;
  let description: string | undefined;

  if (errorList.length > 0) {
    if (errorList.length === 1) {
      title = isGenericValidation ? "Validation failed" : rawMessage;
      description = errorList[0];
    } else {
      title = isGenericValidation
        ? `Validation failed (${errorList.length} errors)`
        : rawMessage;
      description = errorList.map((e) => `• ${e}`).join("\n");
    }
  } else if (rawMessage) {
    title = rawMessage;
  }

  const combinedMessage = description
    ? isGenericValidation
      ? description
      : `${title}: ${description}`
    : title;

  return {
    title,
    description,
    message: combinedMessage,
    fieldErrors,
    errorList,
  };
}

/**
 * Fires a Sonner toast with the parsed error, displaying the exact validation
 * reasons or backend failure details to the user.
 */
export function showErrorToast(
  error: unknown,
  fallbackMessage = "The operation failed.",
): ParsedApiError {
  const parsed = parseApiError(error, fallbackMessage);

  if (parsed.description) {
    toast.error(parsed.title, {
      description: parsed.description,
      duration: 6500,
    });
  } else {
    toast.error(parsed.title, {
      duration: 5000,
    });
  }

  return parsed;
}

/**
 * Formats an error into a clean single string for components like DataTable.
 */
export function formatErrorMessage(
  error: unknown,
  fallbackMessage = "The operation failed.",
): string {
  return parseApiError(error, fallbackMessage).message;
}
