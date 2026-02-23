import { defineStore } from 'pinia'
import { ref } from 'vue'
import { menuService } from '@/api/menu'

export const useMenuStore = defineStore('menu', () => {
  const menus = ref([])

  async function fetchMenus() {
    const res = await menuService.fetchMenus()
    menus.value = res.data || []
  }

  async function saveMenu(menu) {
    if (menu.id) {
      return await menuService.updateMenu(menu.id, menu)
    } else {
      return await menuService.createMenu(menu)
    }
  }

  async function deleteMenu(id) {
    await menuService.deleteMenu(id)
  }

  return { menus, fetchMenus, saveMenu, deleteMenu }
})
