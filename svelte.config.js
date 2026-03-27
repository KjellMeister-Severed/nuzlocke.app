import node from '@sveltejs/adapter-node'
import preprocess from 'svelte-preprocess'

export default {
  kit: {
    adapter: node()
  },

  preprocess: [
    preprocess({
      postcss: true
    })
  ]
}
