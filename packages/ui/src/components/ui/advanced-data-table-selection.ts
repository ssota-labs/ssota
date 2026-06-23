"use client"

import * as React from "react"

export type CellCoord = { r: number; c: number }

const key = (r: number, c: number) => `${r}:${c}`

/**
 * Spreadsheet-style cell selection + keyboard navigation for a grid of
 * `rowCount × colCount` cells. Rectangular selection via anchor/focus, additive
 * toggles via Cmd/Ctrl+click, arrow/Home/End/Shift navigation, Cmd/Ctrl+C copy,
 * Escape to clear. Coordinates are visible-row / visible-leaf-column indices.
 */
export function useGridSelection(opts: {
  enabled: boolean
  rowCount: number
  colCount: number
  onCopy: (cells: CellCoord[]) => void
  onClearCells?: (cells: CellCoord[]) => void
}) {
  const { enabled, rowCount, colCount, onCopy, onClearCells } = opts
  const [anchor, setAnchor] = React.useState<CellCoord | null>(null)
  const [focus, setFocus] = React.useState<CellCoord | null>(null)
  const [toggled, setToggled] = React.useState<Set<string>>(() => new Set())

  const selected = React.useMemo(() => {
    const s = new Set<string>()
    if (anchor && focus) {
      const r0 = Math.min(anchor.r, focus.r)
      const r1 = Math.max(anchor.r, focus.r)
      const c0 = Math.min(anchor.c, focus.c)
      const c1 = Math.max(anchor.c, focus.c)
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) s.add(key(r, c))
    }
    toggled.forEach((k) => s.add(k))
    return s
  }, [anchor, focus, toggled])

  const clear = React.useCallback(() => {
    setAnchor(null)
    setFocus(null)
    setToggled(new Set())
  }, [])

  const coordsOf = React.useCallback(
    (set: Set<string>): CellCoord[] =>
      [...set].map((k) => {
        const [r, c] = k.split(":").map(Number)
        return { r: r!, c: c! }
      }),
    [],
  )

  const onCellMouseDown = React.useCallback(
    (r: number, c: number, e: React.MouseEvent) => {
      if (!enabled) return
      if (e.metaKey || e.ctrlKey) {
        setToggled((prev) => {
          const next = new Set(prev)
          const k = key(r, c)
          if (next.has(k)) next.delete(k)
          else next.add(k)
          return next
        })
        setAnchor({ r, c })
        setFocus({ r, c })
      } else if (e.shiftKey && anchor) {
        setFocus({ r, c })
      } else {
        setAnchor({ r, c })
        setFocus({ r, c })
        setToggled(new Set())
      }
    },
    [enabled, anchor],
  )

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return
      const k = e.key
      if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "c") {
        const cells = coordsOf(selected)
        if (cells.length) {
          e.preventDefault()
          onCopy(cells)
        }
        return
      }
      if (k === "Escape") {
        clear()
        return
      }
      if ((k === "Delete" || k === "Backspace") && onClearCells) {
        const cells = coordsOf(selected)
        if (cells.length) {
          e.preventDefault()
          onClearCells(cells)
        }
        return
      }
      const deltas: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }
      const cur = focus ?? { r: 0, c: 0 }
      if (deltas[k]) {
        e.preventDefault()
        const [dr, dc] = deltas[k]!
        const nr = Math.max(0, Math.min(rowCount - 1, cur.r + dr))
        const nc = Math.max(0, Math.min(colCount - 1, cur.c + dc))
        setFocus({ r: nr, c: nc })
        if (!e.shiftKey) {
          setAnchor({ r: nr, c: nc })
          setToggled(new Set())
        }
        return
      }
      if (k === "Home" || k === "End") {
        e.preventDefault()
        const nc = k === "Home" ? 0 : colCount - 1
        setFocus({ r: cur.r, c: nc })
        if (!e.shiftKey) {
          setAnchor({ r: cur.r, c: nc })
          setToggled(new Set())
        }
      }
    },
    [enabled, focus, rowCount, colCount, selected, coordsOf, onCopy, onClearCells, clear],
  )

  return {
    enabled,
    onCellMouseDown,
    onKeyDown,
    clear,
    hasSelection: selected.size > 0,
    isSelected: (r: number, c: number) => selected.has(key(r, c)),
    isFocus: (r: number, c: number) => focus?.r === r && focus?.c === c,
  }
}

/** RFC-4180-ish CSV cell escaping. */
export function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
