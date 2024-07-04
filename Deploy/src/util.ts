export function mimes(filePath: string) {
  return filePath.endsWith(".html")
    ? "text/html"
    : filePath.endsWith(".css")
      ? "text/css"
      : "application/javascript";
}
