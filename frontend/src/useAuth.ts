import { useContext } from 'react'
import { Ctx } from './AuthContext'

export const useAuth = () => useContext(Ctx)
