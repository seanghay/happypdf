<script setup lang="ts">
import { nextTick, onMounted, ref, shallowRef, watch } from 'vue';

import { demos } from '../demos';

const props = defineProps<{
  /** Key into the demo source registry. */
  id: string;
  height?: string;
}>();

const demo = demos[props.id];
if (!demo) throw new Error(`Unknown demo: ${props.id}`);

const source = ref(demo.code.trim());
const canvases = ref<HTMLCanvasElement[]>([]);
const pageCount = ref(0);
const downloadUrl = shallowRef('');
const error = ref('');
const running = ref(false);
const status = ref('Loading happypdf…');

const BASE = import.meta.env.BASE_URL;

let lib: any = null;
let pdfjs: any = null;
const fontCache = new Map<string, Uint8Array>();

/** The library is loaded as the published browser bundle, so the demos exercise
 * exactly what a reader would get from a script tag. */
const loadLib = async () => {
  if (lib) return lib;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${BASE}happypdf.min.js`;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load the happypdf bundle'));
    document.head.appendChild(script);
  });
  lib = (window as any).happypdf;
  return lib;
};

// Chrome refuses to display blob: PDFs inside an iframe, so the preview is
// rasterised with pdf.js instead of handed to the built-in viewer.
const loadPdfjs = async () => {
  if (pdfjs) return pdfjs;
  const mod = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  mod.GlobalWorkerOptions.workerSrc = worker.default;
  pdfjs = mod;
  return pdfjs;
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

const render = async (bytes: Uint8Array) => {
  const lib = await loadPdfjs();
  const doc = await lib.getDocument({ data: bytes.slice() }).promise;

  pageCount.value = doc.numPages;
  const rendered: HTMLCanvasElement[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const scale = Math.min(2, (window.devicePixelRatio || 1) * 1.5);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = '100%';

    await page.render({
      canvasContext: canvas.getContext('2d')!,
      viewport,
    }).promise;

    rendered.push(canvas);
  }

  canvases.value = rendered;
};

const run = async () => {
  running.value = true;
  error.value = '';
  status.value = 'Running…';

  try {
    const happypdf = await loadLib();

    const fonts: Record<string, Uint8Array> = {};
    for (const name of demo.fonts ?? []) fonts[name] = await loadFont(name);

    const build = new Function(
      'happypdf',
      'fonts',
      `return (async () => { ${source.value} })()`,
    );

    const pdfDoc = await build(happypdf, fonts);
    if (!pdfDoc || typeof pdfDoc.save !== 'function') {
      throw new Error('The snippet must return a PDFDocument');
    }

    const bytes = await pdfDoc.save();

    if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value);
    downloadUrl.value = URL.createObjectURL(
      new Blob([bytes], { type: 'application/pdf' }),
    );

    await render(bytes);
    status.value = '';
    await mountCanvases();
  } catch (e: any) {
    canvases.value = [];
    error.value = e?.message ?? String(e);
  } finally {
    running.value = false;
  }
};

const output = ref<HTMLElement | null>(null);

// The canvases are created imperatively by pdf.js, so they are attached to the
// container by hand once it is in the DOM.
const mountCanvases = async () => {
  await nextTick();
  output.value?.replaceChildren(...canvases.value);
};

watch(canvases, mountCanvases);

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
        :rows="Math.min(source.split('\n').length + 1, 26)"
        @keydown.ctrl.enter.prevent="run"
        @keydown.meta.enter.prevent="run"
      />
      <div class="pdf-demo__bar">
        <button :disabled="running" @click="run">
          {{ running ? 'Running…' : 'Run' }}
        </button>
        <span class="pdf-demo__hint">⌘/Ctrl + Enter</span>
        <span v-if="pageCount > 1" class="pdf-demo__hint"
          >{{ pageCount }} pages</span
        >
        <a v-if="downloadUrl" :href="downloadUrl" download="demo.pdf">
          Download PDF
        </a>
      </div>
    </div>

    <div class="pdf-demo__preview" :style="{ maxHeight: height ?? '460px' }">
      <pre v-if="error" class="pdf-demo__error">{{ error }}</pre>
      <p v-else-if="status" class="pdf-demo__status">{{ status }}</p>
      <div v-show="!error && !status" ref="output" class="pdf-demo__pages" />
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
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
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
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.pdf-demo__bar button:disabled {
  opacity: 0.6;
}

.pdf-demo__hint {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.pdf-demo__bar a {
  margin-left: auto;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

.pdf-demo__preview {
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  overflow: auto;
}

.pdf-demo__pages {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pdf-demo__pages :deep(canvas) {
  display: block;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 1px 6px rgb(0 0 0 / 18%);
}

.pdf-demo__error,
.pdf-demo__status {
  margin: 0;
  padding: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}

.pdf-demo__error {
  color: var(--vp-c-danger-1);
  white-space: pre-wrap;
}

.pdf-demo__status {
  color: var(--vp-c-text-3);
}
</style>
