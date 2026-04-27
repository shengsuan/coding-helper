const adjectives = [
  'brave', 'clever', 'eager', 'gentle', 'happy',
  'jolly', 'kind', 'lively', 'merry', 'nice',
  'proud', 'silly', 'witty', 'zealous', 'wise'
];

const nouns = [
  'panda', 'tiger', 'eagle', 'dolphin', 'fox',
  'wolf', 'bear', 'lion', 'hawk', 'owl',
  'deer', 'rabbit', 'shark', 'whale', 'lynx'
];
export function generateRandomLabel(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}_${noun}`;
}
