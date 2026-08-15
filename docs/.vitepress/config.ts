import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'HappyPDF',
  description:
    'Create and modify PDF documents in any JavaScript environment, with HarfBuzz shaping for complex scripts.',
  base: '/happypdf/',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    [
      'link',
      { rel: 'icon', href: '/happypdf/favicon.svg', type: 'image/svg+xml' },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Demos', link: '/demos' },
      { text: 'API', link: '/api/' },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/happypdf',
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Why HappyPDF', link: '/guide/why' },
            { text: 'Migrating from pdf-lib', link: '/guide/migration' },
          ],
        },
        {
          text: 'Text',
          items: [
            { text: 'Fonts and Shaping', link: '/guide/fonts' },
            { text: 'Wrapping and Alignment', link: '/guide/text-layout' },
          ],
        },
        {
          text: 'Content',
          items: [
            { text: 'Creating and Editing', link: '/guide/documents' },
            { text: 'Images', link: '/guide/images' },
            { text: 'Graphics', link: '/guide/graphics' },
            { text: 'Forms', link: '/guide/forms' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Encryption and Metadata', link: '/guide/security' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/seanghay/happypdf' },
    ],

    search: { provider: 'local' },

    footer: {
      message:
        'MIT Licensed. A fork of <a href="https://github.com/Hopding/pdf-lib">pdf-lib</a>.',
      copyright: 'Copyright © 2026 Seanghay Yath',
    },

    editLink: {
      pattern: 'https://github.com/seanghay/happypdf/edit/main/docs/:path',
    },
  },
});
