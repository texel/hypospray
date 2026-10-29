/** Code drawn in a diagram. The tag only marks it as TypeScript for the editor. */
export const ts = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw(strings, ...values).trim();

export const inlineCode = (text: string) => text.replace(/`([^`]+)`/g, '<code>$1</code>');
