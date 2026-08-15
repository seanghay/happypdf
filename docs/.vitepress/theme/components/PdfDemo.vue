<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';

import { demos } from '../demos';

const props = defineProps<{
  /** Key into the demo source registry. */
  id: string;
  height?: string;
}>();

const demo = demos[props.id];
if (!demo) throw new Error(`Unknown demo: ${props.id}`);

const source = ref(demo.code.trim());
const url = shallowRef<string>('');
const error = ref<string>('');
const running = ref(false);
const ready = ref(false);

let lib: any = null;
const fontCache = new Map<string, Uint8Array>();

const BASE = import.meta.env.BASE_URL;

const loadLib = async () => {
  if (lib) return lib;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${BASE}happypdf.min.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load happypdf bundle'));
    document.head.appendChild(script);
  });
  lib = (window as any).happypdf;
  return lib;
};

const loadFont = async (name: string) => {
  const cached = fontCache.get(name);
  if (cached) return cached;
  const res = await fetch(`${BASE}fonts/${name}.ttf`);
  if (!res.ok) throw new Error(`Failed to load font: ${name}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  fontCache.set(name, bytes);
  return bytes;
};

const run = async () => {
  running.value = true;
  error.value = '';

  try {
    const happypdf = await loadLib();

    const fonts: Record<string, Uint8Array> = {};
    for (const name of demo.fonts ?? []) fonts[name] = await loadFont(name);

    // eslint-disable-next-line no-new-func
    const build = new Function(
      'happypdf',
      'fonts',
      `return (async () => { ${source.value} })()`,
    );

    const doc = await build(happypdf, fonts);
    if (!doc || typeof doc.save !== 'function') {
      throw new Error('The snippet must return a PDFDocument');
    }

    const bytes = await doc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });

    if (url.value) URL.revokeObjectURL(url.value);
    url.value = URL.createObjectURL(blob);
  } catch (e: any) {
    error.value = e?.message ?? String(e);
  } finally {
    running.value = false;
    ready.value = true;
  }
};

onMounted(run);
watch(
  () => props.id,
  () => {
    source.value = demos[props.id].code.trim();
    run();
  },
);
</script>

<template>
  <div class="pdf-demo">
    <div class="pdf-demo__editor">
      <textarea
        v-model="source"
        spellcheck="false"
        :rows="Math.min(source.split('\n').length + 1, 24)"
        @keydown.ctrl.enter="run"
        @keydown.meta.enter="run"
      />
      <div class="pdf-demo__bar">
        <button :disabled="running" @click="run">
          {{ running ? 'Running…' : 'Run' }}
        </button>
        <span class="pdf-demo__hint">⌘/Ctrl + Enter</span>
        <a v-if="url" :href="url" download="demo.pdf">Download PDF</a>
      </div>
    </div>

    <div class="pdf-demo__output" :style="{ height: height ?? '420px' }">
      <p v-if="error" class="pdf-demo__error">{{ error }}</p>
      <p v-else-if="!ready" class="pdf-demo__loading">Loading happypdf…</p>
      <iframe v-else-if="url" :src="url" title="Rendered PDF" />
    </div>
  </div>
</template>

<style scoped>
.pdf-demo {
  display: grid;
  gap: 12px;
  margin: 20px 0;
  grid-template-columns: 1fr;
}

@media (min-width: 960px) {
  .pdf-demo {
    grid-template-columns: 1fr 1fr;
  }
}

.pdf-demo__editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pdf-demo textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px 8px 0 0;
  background: var(--vp-code-block-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.6;
  resize: vertical;
  tab-size: 2;
}

.pdf-demo textarea:focus {
  outline: 1px solid var(--vp-c-brand-1);
}

.pdf-demo__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-top: 0;
  border-radius: 0 0 8px 8px;
  background: var(--vp-c-bg-soft);
}

.pdf-demo__bar button {
  padding: 4px 14px;
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-size: 13px;
  font-weight: 600;
}

.pdf-demo__bar button:disabled {
  opacity: 0.6;
}

.pdf-demo__hint,
.pdf-demo__bar a {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.pdf-demo__bar a {
  margin-left: auto;
  color: var(--vp-c-brand-1);
}

.pdf-demo__output {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.pdf-demo__output iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.pdf-demo__error,
.pdf-demo__loading {
  margin: 0;
  padding: 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}

.pdf-demo__error {
  color: var(--vp-c-danger-1);
  white-space: pre-wrap;
}
</style>
