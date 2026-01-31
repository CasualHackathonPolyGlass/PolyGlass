
"use client"

import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react"
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
} from "framer-motion"

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

type UseMediaQueryOptions = {
  defaultValue?: boolean
  initializeWithValue?: boolean
}

const IS_SERVER = typeof window === "undefined"

export function useMediaQuery(
  query: string,
  {
    defaultValue = false,
    initializeWithValue = true,
  }: UseMediaQueryOptions = {}
): boolean {
  const getMatches = (query: string): boolean => {
    if (IS_SERVER) {
      return defaultValue
    }
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState<boolean>(() => {
    if (initializeWithValue) {
      return getMatches(query)
    }
    return defaultValue
  })

  const handleChange = () => {
    setMatches(getMatches(query))
  }

  useIsomorphicLayoutEffect(() => {
    const matchMedia = window.matchMedia(query)
    handleChange()

    matchMedia.addEventListener("change", handleChange)

    return () => {
      matchMedia.removeEventListener("change", handleChange)
    }
  }, [query])

  return matches
}

const duration = 0.15
const transition = { duration, ease: [0.32, 0.72, 0, 1], filter: "blur(4px)" }
const transitionOverlay = { duration: 0.5, ease: [0.32, 0.72, 0, 1] }

interface CarouselProps {
  items: React.ReactNode[]
  isCarouselActive: boolean
  onItemClick?: (index: number) => void
  autoRotate?: boolean
  isPaused?: boolean
}

const Carousel = memo(
  ({
    items,
    isCarouselActive,
    onItemClick,
    autoRotate = false,
    isPaused = false,
  }: CarouselProps) => {
    const isScreenSizeSm = useMediaQuery("(max-width: 640px)")
    const controls = useAnimation()
    const cylinderWidth = isScreenSizeSm ? 1200 : 2000
    const faceCount = items.length
    const faceWidth = 320 // Smaller fixed width for each card
    const radius = cylinderWidth / (2 * Math.PI)
    const rotation = useMotionValue(0)
    const transform = useTransform(
      rotation,
      (value) => `rotate3d(0, 1, 0, ${value}deg)`
    )

    useEffect(() => {
      if (autoRotate && !isPaused) {
        const interval = setInterval(() => {
          rotation.set(rotation.get() - 0.5)
        }, 30)
        return () => clearInterval(interval)
      }
    }, [autoRotate, isPaused, rotation])

    return (
      <div
        className="flex h-full items-center justify-center"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <motion.div
          drag={isCarouselActive ? "x" : false}
          className="relative flex h-full origin-center cursor-grab justify-center active:cursor-grabbing"
          style={{
            transform,
            rotateY: rotation,
            width: cylinderWidth,
            transformStyle: "preserve-3d",
          }}
          onDrag={(_, info) =>
            isCarouselActive &&
            rotation.set(rotation.get() + info.offset.x * 0.05)
          }
          onDragEnd={(_, info) =>
            isCarouselActive &&
            controls.start({
              rotateY: rotation.get() + info.velocity.x * 0.05,
              transition: {
                type: "spring",
                stiffness: 100,
                damping: 30,
                mass: 0.1,
              },
            })
          }
          animate={controls}
        >
          {items.map((item, i) => (
            <motion.div
              key={`carousel-item-${i}`}
              className="absolute flex h-full origin-center items-center justify-center p-2"
              style={{
                width: `${faceWidth}px`,
                transform: `rotateY(${
                  i * (360 / faceCount)
                }deg) translateZ(${radius}px)`,
              }}
              onClick={() => onItemClick?.(i)}
            >
              {item}
            </motion.div>
          ))}
        </motion.div>
      </div>
    )
  }
)

Carousel.displayName = "Carousel"

export function ThreeDCarousel({ items, onItemClick, autoRotate = false }: { items: React.ReactNode[], onItemClick?: (index: number) => void, autoRotate?: boolean }) {
  const [isCarouselActive, setIsCarouselActive] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  return (
    <motion.div 
      layout 
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[250px] w-full overflow-visible pt-8">
        <Carousel
          items={items}
          isCarouselActive={isCarouselActive}
          onItemClick={onItemClick}
          autoRotate={autoRotate}
          isPaused={isPaused}
        />
      </div>
    </motion.div>
  )
}

export { ThreeDCarousel as ThreeDPhotoCarousel }
