import { createContext, useContext } from 'react'

// navigate(tab, params) accessible partout (aide « Ça coince ? » dans les exercices)
export const NavContext = createContext(() => {})
export const useNavigate = () => useContext(NavContext)
