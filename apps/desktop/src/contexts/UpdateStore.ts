import { create } from 'zustand'
import { check, Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

interface UpdateState {
  update: Update | null
  isChecking: boolean
  isInstalling: boolean
  installProgress: number
  installError: string | null
  showToast: boolean
  toastExiting: boolean
  checkForUpdates: () => Promise<void>
  installUpdate: () => Promise<void>
  closeToast: () => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  update: null,
  isChecking: false,
  isInstalling: false,
  installProgress: 0,
  installError: null,
  showToast: false,
  toastExiting: false,

  checkForUpdates: async () => {
    set({ isChecking: true })
    try {
      const update = await check()
      if (update) {
        set({ update, showToast: true, toastExiting: false })
        
        // Auto-hide toast after 10 seconds smoothly
        setTimeout(() => {
          get().closeToast()
        }, 10000)
      }
    } catch (e) {
      console.error('Failed to check for updates:', e)
    } finally {
      set({ isChecking: false })
    }
  },

  installUpdate: async () => {
    const { update } = get()
    if (!update) return

    set({ isInstalling: true, installError: null, installProgress: 0 })
    try {
      let downloaded = 0
      let contentLength = 0

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            if (contentLength > 0) {
              set({ installProgress: Math.round((downloaded / contentLength) * 100) })
            }
            break
          case 'Finished':
            set({ installProgress: 100 })
            break
        }
      })
      await relaunch()
    } catch (e: any) {
      console.error('Failed to install update:', e)
      set({ installError: e.toString(), isInstalling: false })
    }
  },

  closeToast: () => {
    if (!get().showToast || get().toastExiting) return
    set({ toastExiting: true })
    setTimeout(() => {
      set({ showToast: false, toastExiting: false })
    }, 300) // Match slide-out-right animation duration
  }
}))
