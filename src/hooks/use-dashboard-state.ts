import { useReducer, useCallback, useMemo } from 'react'
import type { InstantSendResult } from '@/components/dashboard/instant-send-dialog'

export interface Patient {
  id: string
  name: string
  complianceRate: number
  isActive: boolean
  photoUrl?: string
  phoneNumber?: string
}

export interface DashboardStats {
  totalPatients: number
  activePatients: number
  inactivePatients: number
}

export interface DashboardState {
  patients: Patient[]
  filteredPatients: Patient[]
  loading: boolean
  searchQuery: string
  activeFilters: string[]
  userRole: string | null
  dashboardStats: DashboardStats
  showAddPatientModal: boolean
  showInstantSendDialog: boolean
  isInstantSending: boolean
  instantSendResult: InstantSendResult | null
}

type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PATIENTS'; payload: Patient[] }
  | { type: 'SET_FILTERED_PATIENTS'; payload: Patient[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ACTIVE_FILTERS'; payload: string[] }
  | { type: 'TOGGLE_FILTER'; payload: string }
  | { type: 'SET_USER_ROLE'; payload: string | null }
  | { type: 'SET_DASHBOARD_STATS'; payload: DashboardStats }
  | { type: 'SET_SHOW_ADD_PATIENT_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_INSTANT_SEND_DIALOG'; payload: boolean }
  | { type: 'SET_IS_INSTANT_SENDING'; payload: boolean }
  | { type: 'SET_INSTANT_SEND_RESULT'; payload: InstantSendResult | null }
  | { type: 'RESET_INSTANT_SEND' }

const initialState: DashboardState = {
  patients: [],
  filteredPatients: [],
  loading: true,
  searchQuery: '',
  activeFilters: [],
  userRole: null,
  dashboardStats: {
    totalPatients: 0,
    activePatients: 0,
    inactivePatients: 0,
  },
  showAddPatientModal: false,
  showInstantSendDialog: false,
  isInstantSending: false,
  instantSendResult: null,
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_PATIENTS':
      return { ...state, patients: action.payload }
    
    case 'SET_FILTERED_PATIENTS':
      return { ...state, filteredPatients: action.payload }
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    
    case 'SET_ACTIVE_FILTERS':
      return { ...state, activeFilters: action.payload }
    
    case 'TOGGLE_FILTER':
      const filter = action.payload
      const currentFilters = state.activeFilters
      const newFilters = currentFilters.includes(filter)
        ? currentFilters.filter(f => f !== filter)
        : [...currentFilters, filter]
      return { ...state, activeFilters: newFilters }
    
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload }
    
    case 'SET_DASHBOARD_STATS':
      return { ...state, dashboardStats: action.payload }
    
    case 'SET_SHOW_ADD_PATIENT_MODAL':
      return { ...state, showAddPatientModal: action.payload }
    
    case 'SET_SHOW_INSTANT_SEND_DIALOG':
      return { ...state, showInstantSendDialog: action.payload }
    
    case 'SET_IS_INSTANT_SENDING':
      return { ...state, isInstantSending: action.payload }
    
    case 'SET_INSTANT_SEND_RESULT':
      return { ...state, instantSendResult: action.payload }
    
    case 'RESET_INSTANT_SEND':
      return {
        ...state,
        showInstantSendDialog: false,
        isInstantSending: false,
        instantSendResult: null,
      }
    
    default:
      return state
  }
}

export function useDashboardState() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState)

  // Memoized actions to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    setLoading: (loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }),
    
    setPatients: (patients: Patient[]) => 
      dispatch({ type: 'SET_PATIENTS', payload: patients }),
    
    setFilteredPatients: (patients: Patient[]) => 
      dispatch({ type: 'SET_FILTERED_PATIENTS', payload: patients }),
    
    setSearchQuery: (query: string) => 
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query }),
    
    setActiveFilters: (filters: string[]) => 
      dispatch({ type: 'SET_ACTIVE_FILTERS', payload: filters }),
    
    toggleFilter: (filter: string) => 
      dispatch({ type: 'TOGGLE_FILTER', payload: filter }),
    
    setUserRole: (role: string | null) => 
      dispatch({ type: 'SET_USER_ROLE', payload: role }),
    
    setDashboardStats: (stats: DashboardStats) => 
      dispatch({ type: 'SET_DASHBOARD_STATS', payload: stats }),
    
    setShowAddPatientModal: (show: boolean) => 
      dispatch({ type: 'SET_SHOW_ADD_PATIENT_MODAL', payload: show }),
    
    setShowInstantSendDialog: (show: boolean) => 
      dispatch({ type: 'SET_SHOW_INSTANT_SEND_DIALOG', payload: show }),
    
    setIsInstantSending: (sending: boolean) => 
      dispatch({ type: 'SET_IS_INSTANT_SENDING', payload: sending }),
    
    setInstantSendResult: (result: InstantSendResult | null) => 
      dispatch({ type: 'SET_INSTANT_SEND_RESULT', payload: result }),
    
    resetInstantSend: () => 
      dispatch({ type: 'RESET_INSTANT_SEND' }),
  }), [])

  // Memoized filter function
  const filterPatients = useCallback(() => {
    let filtered = state.patients

    if (state.searchQuery.trim()) {
      filtered = filtered.filter((patient) =>
        patient.name.toLowerCase().includes(state.searchQuery.toLowerCase())
      )
    }

    // Apply multiple status filters
    if (state.activeFilters.length > 0) {
      filtered = filtered.filter((patient) => {
        const isActive = patient.isActive
        return (
          (state.activeFilters.includes('active') && isActive) ||
          (state.activeFilters.includes('inactive') && !isActive)
        )
      })
    }

    actions.setFilteredPatients(filtered)
  }, [state.patients, state.searchQuery, state.activeFilters, actions])

  // Memoized computed values
  const computedStats = useMemo(() => ({
    totalPatients: state.patients.length,
    activePatients: state.patients.filter(p => p.isActive).length,
    inactivePatients: state.patients.filter(p => !p.isActive).length,
  }), [state.patients])

  return {
    state,
    actions,
    filterPatients,
    computedStats,
  }
}
