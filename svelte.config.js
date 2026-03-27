import preprocess from 'svelte-preprocess';
import node from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: node()
  },

  preprocess: [
    preprocess({
      postcss: true
    })
  ]
};
