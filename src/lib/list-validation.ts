export const LIST_NAME_MAX_LENGTH = 100;
export const LIST_DESCRIPTION_MAX_LENGTH = 1000;

export type ListDetailsInput = { name?: unknown; description?: unknown };

export type ListDetailsResult =
  | { ok: true; value: { name?: string; description?: string | null } }
  | { ok: false; error: string };

/**
 * Validates the identity fields of a list.
 * - Absent key => omitted from `value` (caller leaves the column untouched).
 * - `name`: must be a string; trimmed; non-empty; <= LIST_NAME_MAX_LENGTH.
 * - `description`: must be a string or null; trimmed; ""/whitespace/null => null (clears it);
 *   <= LIST_DESCRIPTION_MAX_LENGTH.
 */
export function validateListDetails(
  input: ListDetailsInput,
): ListDetailsResult {
  const value: { name?: string; description?: string | null } = {};

  if ("name" in input && input.name !== undefined) {
    if (typeof input.name !== "string") {
      return { ok: false, error: "Name must be text" };
    }
    const trimmed = input.name.trim();
    if (trimmed.length === 0) {
      return { ok: false, error: "List name is required" };
    }
    if (trimmed.length > LIST_NAME_MAX_LENGTH) {
      return {
        ok: false,
        error: `List name must be ${LIST_NAME_MAX_LENGTH} characters or fewer`,
      };
    }
    value.name = trimmed;
  }

  if ("description" in input && input.description !== undefined) {
    if (input.description !== null && typeof input.description !== "string") {
      return { ok: false, error: "Description must be text" };
    }
    const trimmed = input.description === null ? "" : input.description.trim();
    if (trimmed.length === 0) {
      value.description = null;
    } else if (trimmed.length > LIST_DESCRIPTION_MAX_LENGTH) {
      return {
        ok: false,
        error: `Description must be ${LIST_DESCRIPTION_MAX_LENGTH} characters or fewer`,
      };
    } else {
      value.description = trimmed;
    }
  }

  return { ok: true, value };
}
