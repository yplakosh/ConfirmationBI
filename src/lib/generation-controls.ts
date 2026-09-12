/** Server-side switches: invalid values disable the operation, never enable it. */
export function paidGenerationEnabled() {
  return process.env.GENERATION_PAID_ENABLED === "true";
}

export function publishingEnabled() {
  return (process.env.PUBLISHING_ENABLED ?? "true") === "true";
}
