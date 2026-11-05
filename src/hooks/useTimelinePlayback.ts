import { useEffect, useState } from "react"
import { MAX_FRAMES, frameNames } from "../types/scenario"

export function useTimelinePlayback({
  onDeleteSelected,
}: {
  onDeleteSelected?: () => void
} = {}) {
  const [frames, setFrames] = useState(frameNames)
  const [selectedFrame, setSelectedFrame] = useState(2)
  const [playing, setPlaying] = useState(false)

  // Intervalo de reproducción automática
  useEffect(() => {
    if (!playing) return

    const timer = window.setInterval(() => {
      setSelectedFrame((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 900)

    return () => window.clearInterval(timer)
  }, [playing, frames.length])

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.matches("input, textarea, select") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setPlaying(false)
        setSelectedFrame((current) => Math.max(0, current - 1))
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        setPlaying(false)
        setSelectedFrame((current) =>
          Math.min(frames.length - 1, current + 1),
        )
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        onDeleteSelected
      ) {
        event.preventDefault()
        onDeleteSelected()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [frames.length, onDeleteSelected])

  const togglePlay = () => {
    if (!playing && selectedFrame === frames.length - 1) {
      setSelectedFrame(0)
    }
    setPlaying((current) => !current)
  }

  const prevFrame = () => {
    setPlaying(false)
    setSelectedFrame((current) => Math.max(0, current - 1))
  }

  const nextFrame = () => {
    setPlaying(false)
    setSelectedFrame((current) => Math.min(frames.length - 1, current + 1))
  }

  const addFrame = () => {
    if (frames.length >= MAX_FRAMES) return
    const nextSceneNumber =
      Math.max(
        frames.length,
        ...frames.map((frame) => {
          const match = frame.match(/^Escena (\d+)$/)
          return match ? Number(match[1]) : 0
        }),
      ) + 1
    setFrames((current) => [...current, `Escena ${nextSceneNumber}`])
    setSelectedFrame(frames.length)
  }

  return {
    frames,
    setFrames,
    selectedFrame,
    setSelectedFrame,
    playing,
    setPlaying,
    togglePlay,
    prevFrame,
    nextFrame,
    addFrame,
  }
}
