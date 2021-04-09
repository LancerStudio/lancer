import parser from '@lancer/posthtml-parser'

export const POSTHTML_OPTIONS = {
  parser,
  customVoidElements: ['page', 'yield', 'include'],
}
