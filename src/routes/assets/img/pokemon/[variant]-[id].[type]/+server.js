const SPRITE_CDN = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export async function GET({ params }) {
  const { id, variant } = params

  const path = variant === 'shiny' ? `shiny/${id}` : id
  const url = `${SPRITE_CDN}/${path}.png`

  const res = await fetch(url)

  if (!res.ok) {
    return new Response(null, { status: 404 })
  }

  const buffer = await res.arrayBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=604800, immutable'
    }
  })
}