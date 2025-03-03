export function getDomainAndSubdomain(url: string): string {
  try {
    const urlObject = new URL(url);
    const hostnameParts = urlObject.hostname.split(".");

    if (
      hostnameParts.length < 2 ||
      hostnameParts.every((part) => !Number.isNaN(Number(part)))
    ) {
      return urlObject.hostname;
    }

    return urlObject.hostname;
  } catch (error) {
    console.error("Error extracting domain:", error);
    return url;
  }
}
