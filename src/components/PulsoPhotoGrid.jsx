export default function PulsoPhotoGrid({ photos = [], compact = false }) {
  const list = photos.filter((photo) => photo?.url)
  if (!list.length) return null

  const count = list.length
  const gap = compact ? 'gap-1' : 'gap-1.5'
  const radius = compact ? 'rounded-lg' : 'rounded-2xl'

  return (
    <div
      className={`grid overflow-hidden ${gap} ${radius} ${
        count === 1 ? 'grid-cols-1' : 'grid-cols-2'
      }`}
    >
      {list.map((photo, index) => {
        const tall = count === 1 || (count === 3 && index === 0)
        return (
          <img
            key={photo.id || photo.url}
            src={photo.url}
            alt=""
            className={`w-full object-cover ${radius} ${
              compact ? (tall ? 'h-28' : 'h-20') : tall ? 'max-h-72 min-h-40' : 'h-36 sm:h-40'
            }`}
          />
        )
      })}
    </div>
  )
}
