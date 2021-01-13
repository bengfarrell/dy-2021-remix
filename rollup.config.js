import html from '@web/rollup-plugin-html';
import copy from 'rollup-plugin-copy';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import clean from 'rollup-plugin-clean';

export default {
    input: 'index.html',
    output: { dir: 'dist' },
    plugins: [
        clean(),
        nodeResolve(),
        html(),
        copy({
            targets: [
                { src: 'sampleimages', dest: 'dist/' },
            ]
        })],
};
