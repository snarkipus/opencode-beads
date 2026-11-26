const CANARY_VERSION = "2.4.1";

export const SUPPORTED_OPENCODE_RANGE = `>=2.3.0 <2.4 || ${CANARY_VERSION}`;

/** Admit stable 2.3 releases and the exact canary version, with optional build metadata. */
export function isSupportedOpenCodeVersion(version: string): boolean {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  return match !== null && (match[1] === "2" && match[2] === "3" || match.slice(1, 4).join(".") === CANARY_VERSION);
}
