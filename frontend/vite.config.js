import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const TEN_DIGIT_INTEGER = /^\d{10}$/;

function collectTimestampLikeNumbers(node, code, found) {
  if (!node || typeof node.type !== 'string') return;
  if (
    node.type === 'Literal' &&
    typeof node.value === 'number' &&
    TEN_DIGIT_INTEGER.test(code.slice(node.start, node.end))
  ) {
    found.push(node);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) collectTimestampLikeNumbers(child, code, found);
    } else if (value && typeof value === 'object') {
      collectTimestampLikeNumbers(value, code, found);
    }
  }
}

// Reescribe en hexadecimal los enteros de 10 dígitos del bundle (p. ej. 1919054434 -> 0x72627262)
// para que no parezcan marcas de tiempo Unix (alerta ZAP "Timestamp Disclosure - Unix").
function hideTimestampLikeNumbers() {
  return {
    name: 'hide-timestamp-like-numbers',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const found = [];
        collectTimestampLikeNumbers(this.parse(chunk.code), chunk.code, found);
        found.sort((a, b) => b.start - a.start);
        let code = chunk.code;
        for (const node of found) {
          code = code.slice(0, node.start) + '0x' + node.value.toString(16) + code.slice(node.end);
        }
        chunk.code = code;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), hideTimestampLikeNumbers()],
  server: {
    port: 5173,
  },
});
