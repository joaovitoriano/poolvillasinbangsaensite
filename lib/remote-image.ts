export function shouldBypassImageOptimization(src: string) {
  return /^(?:https?:|blob:|data:)/i.test(src);
}
