
export function shouldPrefixMailto(href: string) {
  return !href.startsWith('mailto:') && !href.startsWith('http') && href.match(/.+@.+/)
}
