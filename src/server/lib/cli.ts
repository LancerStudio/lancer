import { createInterface } from 'readline'

export function createPrompter() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return {
    prompt(questionContent: string) {
      return new Promise(resolve => {
        rl.question(questionContent, resolve)
      })
    },
    close: () => rl.close(),
  }
}
