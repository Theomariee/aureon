/// <reference types="vite/client" />
import type { AureonApi } from '../../shared/api'

declare global {
  interface Window {
    api: AureonApi
  }
}

export {}
