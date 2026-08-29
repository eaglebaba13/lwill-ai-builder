export type ApplicationContext = "corporate" | "builder" | "xnail";

const HOSTNAME_MAP: Readonly<Record<string, ApplicationContext>> = {
  "lwill.in": "corporate",
  "www.lwill.in": "corporate",
  "builder.lwill.in": "builder",
  "www.builder.lwill.in": "builder",
  "xnail.makemeartist.com": "xnail",
  "www.xnail.makemeartist.com": "xnail",
};

export function resolveApplicationContext(
  hostname: string | null | undefined,
): ApplicationContext {
  if (typeof hostname !== "string") {
    return "corporate";
  }

  const withoutPort = hostname.split(":")[0].toLowerCase();

  if (HOSTNAME_MAP[withoutPort] !== undefined) {
    return HOSTNAME_MAP[withoutPort];
  }

  return "corporate";
}
