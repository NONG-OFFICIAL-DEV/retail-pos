import { getCurrentInstance } from 'vue'

export function useAppUtils() {
  const { proxy } = getCurrentInstance()

  return {
    confirm: proxy.$confirm,
    notif: proxy.$notif,
  }
}