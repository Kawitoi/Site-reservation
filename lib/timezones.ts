export const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Paris", "Europe/London", "America/New_York", "America/Los_Angeles", "UTC"];
  }
})();
