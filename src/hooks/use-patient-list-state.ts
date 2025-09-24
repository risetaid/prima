import { useReducer, useCallback, useMemo, useEffect } from 'react'
import { logger } from '@/lib/logger'

export interface Patient {
  id: string
  name: string
  phoneNumber: string
  complianceRate: number
  isActive: boolean
  assignedVolunteerId: string | null
}

export interface PatientListState {
  patients: Patient[]
  searchTerm: string
  statusFilter: 'all' | 'active' | 'inactive'
  complianceFilter: 'all' | 'high' | 'medium' | 'low'
  loading: boolean
  error: string | null
}

type PatientListAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PATIENTS'; payload: Patient[] }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: 'all' | 'active' | 'inactive' }
  | { type: 'SET_COMPLIANCE_FILTER'; payload: 'all' | 'high' | 'medium' | 'low' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FILTERS' }

const initialState: PatientListState = {
  patients: [],
  searchTerm: '',
  statusFilter: 'all',
  complianceFilter: 'all',
  loading: true,
  error: null,
}

function patientListReducer(state: PatientListState, action: PatientListAction): PatientListState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_PATIENTS':
      return { ...state, patients: action.payload, error: null }
    
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload }
    
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload }
    
    case 'SET_COMPLIANCE_FILTER':
      return { ...state, complianceFilter: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'RESET_FILTERS':
      return {
        ...state,
        searchTerm: '',
        statusFilter: 'all',
        complianceFilter: 'all',
      }
    
    default:
      return state
  }
}

export function usePatientListState(externalPatients?: Patient[], externalLoading?: boolean) {
  const [state, dispatch] = useReducer(patientListReducer, initialState)

  // Use external data if provided
  const patients = externalPatients || state.patients
  const loading = externalLoading !== undefined ? externalLoading : state.loading

  // Memoized actions
  const actions = useMemo(() => ({
    setLoading: (loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }),
    
    setPatients: (patients: Patient[]) => 
      dispatch({ type: 'SET_PATIENTS', payload: patients }),
    
    setSearchTerm: (term: string) => 
      dispatch({ type: 'SET_SEARCH_TERM', payload: term }),
    
    setStatusFilter: (filter: 'all' | 'active' | 'inactive') => 
      dispatch({ type: 'SET_STATUS_FILTER', payload: filter }),
    
    setComplianceFilter: (filter: 'all' | 'high' | 'medium' | 'low') => 
      dispatch({ type: 'SET_COMPLIANCE_FILTER', payload: filter }),
    
    setError: (error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }),
    
    resetFilters: () => 
      dispatch({ type: 'RESET_FILTERS' }),
  }), [])

  // Fetch patients function
  const fetchPatients = useCallback(async () => {
    if (externalPatients) return // Don't fetch if external data is provided

    try {
      actions.setLoading(true)
      actions.setError(null)
      
      const response = await fetch('/api/patients')
      if (response.ok) {
        const data = await response.json()
        actions.setPatients(data)
        logger.info(`Fetched ${data.length} patients`)
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch patients`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch patients'
      logger.error('Error fetching patients:', error as Error)
      actions.setError(errorMessage)
    } finally {
      actions.setLoading(false)
    }
  }, [externalPatients, actions])

  // Memoized filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesSearch = patient.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                           patient.phoneNumber.includes(state.searchTerm)

      const matchesStatus = state.statusFilter === 'all' ||
                           (state.statusFilter === 'active' && patient.isActive) ||
                           (state.statusFilter === 'inactive' && !patient.isActive)

      const matchesCompliance = state.complianceFilter === 'all' ||
                               (state.complianceFilter === 'high' && patient.complianceRate >= 80) ||
                               (state.complianceFilter === 'medium' && patient.complianceRate >= 50 && patient.complianceRate < 80) ||
                               (state.complianceFilter === 'low' && patient.complianceRate < 50)

      return matchesSearch && matchesStatus && matchesCompliance
    })
  }, [patients, state.searchTerm, state.statusFilter, state.complianceFilter])

  // Memoized utility functions
  const utilities = useMemo(() => ({
    getInitials: (name: string) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    },

    getComplianceColor: (rate: number) => {
      if (rate >= 80) return 'bg-green-500'
      if (rate >= 50) return 'bg-yellow-500'
      return 'bg-red-500'
    },

    getComplianceLabel: (rate: number) => {
      if (rate >= 80) return { text: 'Tinggi', bg: 'bg-green-100', color: 'text-green-800' }
      if (rate >= 50) return { text: 'Sedang', bg: 'bg-yellow-100', color: 'text-yellow-800' }
      return { text: 'Rendah', bg: 'bg-red-100', color: 'text-red-800' }
    },

    getStatusLabel: (isActive: boolean) => {
      return isActive
        ? { text: 'Aktif', bg: 'bg-blue-100', color: 'text-blue-800' }
        : { text: 'Nonaktif', bg: 'bg-gray-100', color: 'text-gray-800' }
    },
  }), [])

  // Auto-fetch patients on mount if no external data
  useEffect(() => {
    if (!externalPatients) {
      fetchPatients()
    }
  }, [externalPatients, fetchPatients])

  return {
    // State
    patients,
    filteredPatients,
    searchTerm: state.searchTerm,
    statusFilter: state.statusFilter,
    complianceFilter: state.complianceFilter,
    loading,
    error: state.error,
    
    // Actions
    actions,
    
    // Utilities
    utilities,
    
    // Functions
    fetchPatients,
  }
}
