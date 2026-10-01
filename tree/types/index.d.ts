export type TreeRow = {
  id: string
  number: number
  prefix: string
  preview: string
  isOnPath: boolean
  isCurrentTurn: boolean
}

export type TreeSelection = {
  id: string
  number: number
  estimatedTokens: number
  isCurrentTurn: boolean
  canEdit: boolean
}

export type TreeView = {
  rows: TreeRow[]
  selection: TreeSelection | null
  notice: string | null
}

declare module 'claude-code' {
  interface PluginState {
    tree: { view: TreeView }
  }
}
