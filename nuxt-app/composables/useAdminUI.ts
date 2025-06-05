// composables/useAdminUI.ts
import { onMounted } from 'vue'

export function useAdminUI() {
  onMounted(() => {
    // Sidebar dropdown toggle (accordion)
    const sidebarMenu = document.getElementById('sidebar-menu')
    if (sidebarMenu) {
      sidebarMenu.querySelectorAll('li.dropdown > a').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
          e.preventDefault()
          const li = anchor.closest('li.dropdown')
          if (!li) return

          // Toggle this branch
          const submenu = li.querySelector('.sidebar-submenu') as HTMLElement | null
          submenu?.classList.toggle('open')
          li.classList.toggle('dropdown-open')

          // Close siblings
          li.parentElement?.querySelectorAll(':scope > .dropdown').forEach((sibling) => {
            if (sibling !== li) {
              sibling.classList.remove('dropdown-open')
              const sibMenu = sibling.querySelector('.sidebar-submenu') as HTMLElement | null
              sibMenu?.classList.remove('open')
            }
          })
        })
      })
    }

    // Sidebar-wide toggles
    document.querySelectorAll('.sidebar-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active')
        document.querySelector('.sidebar')?.classList.toggle('active')
        document.querySelector('.dashboard-main')?.classList.toggle('active')
      })
    })

    document.querySelector('.sidebar-mobile-toggle')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.add('sidebar-open')
      document.body.classList.add('overlay-active')
    })

    document.querySelector('.sidebar-close-btn')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.remove('sidebar-open')
      document.body.classList.remove('overlay-active')
    })

    // Set active menu item based on URL
    const currentURL = window.location.href
    const links = document.querySelectorAll('#sidebar-menu a')
    links.forEach(link => {
      const anchor = link as HTMLAnchorElement
      if (anchor.href === currentURL) {
        anchor.classList.add('active-page')
        let parent = anchor.parentElement
        while (parent && parent.tagName.toLowerCase() !== 'ul') {
          parent.classList.add('active-page', 'open', 'show')
          parent = parent.parentElement
        }
      }
    })

    // Expand root branches
    document.querySelectorAll('#sidebar-menu > li.has-child').forEach(li => {
      li.classList.add('open')
      li.querySelector('ul')?.classList.add('open')
    })

    // Nested toggle
    document.querySelectorAll('#sidebar-menu li.has-child > a').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault()
        const li = anchor.closest('li')
        if (!li) return
        li.classList.toggle('open')
        li.querySelector('ul')?.classList.toggle('open')
      })
    })

    // Theme toggling
    const button = document.querySelector('[data-theme-toggle]') as HTMLElement | null
    const localStorageTheme = localStorage.getItem('theme')
    let currentThemeSetting = localStorageTheme ?? 'light'

    const updateButton = (theme: string) => {
      if (button) {
        button.setAttribute('aria-label', theme)
        button.innerText = theme
      }
    }

    const updateTheme = (theme: string) => {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('theme', theme)
      updateButton(theme)
    }

    updateTheme(currentThemeSetting)

    button?.addEventListener('click', () => {
      currentThemeSetting = currentThemeSetting === 'dark' ? 'light' : 'dark'
      updateTheme(currentThemeSetting)
    })

    // Table header checkbox (select all)
    const selectAll = document.querySelector('#selectAll') as HTMLInputElement | null
    if (selectAll) {
      selectAll.addEventListener('change', () => {
        document.querySelectorAll<HTMLInputElement>('.form-check .form-check-input').forEach(input => {
          input.checked = selectAll.checked
        })
      })
    }

    // Remove row buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr')
        row?.remove()

        const tableRows = document.querySelectorAll('.table tbody tr')
        if (tableRows.length === 0) {
          document.querySelector('.table')?.classList.add('bg-danger')
          document.querySelector('.no-items-found')?.classList.remove('d-none')
        }
      })
    })
  })
}
