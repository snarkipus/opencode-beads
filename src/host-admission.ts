const ADDITIONAL_HOST_VERSIONS = ["2.4.1", "2.4.2"];

export const SUPPORTED_OPENCODE_RANGE = [">=2.3.0 <2.4", ...ADDITIONAL_HOST_VERSIONS].join(" || ");

/** Admit stable 2.3 releases and explicitly listed versions, with optional build metadata. */
export function isSupportedOpenCodeVersion(version: string): boolean {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
  return match !== null && (match[1] === "2" && match[2] === "3" || ADDITIONAL_HOST_VERSIONS.includes(match.slice(1, 4).join(".")));
}
