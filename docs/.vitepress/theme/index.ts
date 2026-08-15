import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';

import PdfDemo from './components/PdfDemo.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('PdfDemo', PdfDemo);
  },
} satisfies Theme;
