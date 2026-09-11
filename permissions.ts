import type { PermissionLevel } from "@/lib/types";

/**
 * Permission model
 * -----------------
 * READ    — the tool only looks things up (e.g. checking a calendar).
 *           Never needs a confirmation before running.
 * PREPARE — the tool drafts something (an email, a task) without sending
 *           or committing it. Runs freely; the *result* may still need
 *           approval before it's used elsewhere.
 * EXECUTE — the tool takes an action with a real-world or irreversible
 *           effect (sending, purchasing, booking, deleting, changing an
 *           account). Always requires explicit approval via
 *           ConfirmationCard before it can run.
 */
export const PERMISSION_LEVELS: PermissionLevel[] = ["read", "prepare", "execute"];

export function requiresConfirmation(level: PermissionLevel): boolean {
  return level === "execute";
}

export function permissionLabel(level: PermissionLevel): string {
  switch (level) {
    case "read":
      return "Read-only";
    case "prepare":
      return "Prepares a draft";
    case "execute":
      return "Requires your approval";
  }
}
