import typescript from 'rollup-plugin-typescript2';
import del from 'rollup-plugin-delete';
import cleanup from 'rollup-plugin-cleanup';
import { spawnSync } from 'child_process';

const cliConfig = require('./config/cliConfig.json');

/**
 * Rollup global plugins
 */
const plugins = [
  typescript({
    typescript: require('typescript'),
  }),
  cleanup(),
];

export default [
  {
    input: 'src/index.ts',
    output: {
      file: `dist/${cliConfig.name}`,
      format: 'cjs',
      banner: '#!/usr/bin/env node',
    },
    plugins: [
      ...plugins,
      {
        name: 'closeBundle',
        writeBundle: () => {
          console.info(`make ${cliConfig.name} executable`);
          spawnSync(`chmod`, ['u+x', `dist/${cliConfig.name}`]);
        },
      },
      !process.env.ROLLUP_WATCH ? del({ targets: 'dist/**/*' }) : undefined,
    ],
  },
];
