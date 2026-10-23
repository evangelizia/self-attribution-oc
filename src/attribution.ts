export const COAUTHOR_EMAIL =
  "19894018+evangelizia@users.noreply.github.com";
export const COAUTHOR_TRAILER = `Co-authored-by: evangelizia <${COAUTHOR_EMAIL}>`;

export function hasCoauthorTrailer(message: string): boolean {
  return message.toLowerCase().includes(COAUTHOR_EMAIL.toLowerCase());
}
