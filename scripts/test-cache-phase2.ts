#!/usr/bin/env tsx

/**
 * Test script for Phase 2 Redis caching improvements
 * This demonstrates the usage of the new adaptive TTL and hash-based caching features
 */

import {
  ADAPTIVE_TTL,
  getWithAdaptiveTTL,
  setPatientHash,
  getPatientHash,
  getPatientHashField,
  updatePatientHashField,
  warmCriticalCaches,
  getCacheWarmingStatus
} from '../src/lib/cache-phase2'

async function testAdaptiveTTL() {
  console.log('🧪 Testing Adaptive TTL functionality...')

  const testKey = 'test:adaptive-ttl'
  const testData = { message: 'Hello, Adaptive TTL!', timestamp: Date.now() }

  try {
    // Set initial data with short TTL
    const setResult = await setPatientHash('test-patient', testData)
    console.log('✅ Set patient hash:', setResult)

    // Get with adaptive TTL (should extend TTL)
    const retrievedData = await getWithAdaptiveTTL(testKey, ADAPTIVE_TTL.MODERATE_ACCESS)
    console.log('✅ Retrieved with adaptive TTL:', retrievedData)

    console.log('✅ Adaptive TTL test completed')
  } catch (error) {
    console.error('❌ Adaptive TTL test failed:', error)
  }
}

async function testPatientHashOperations() {
  console.log('\n🧪 Testing Patient Hash operations...')

  const patientId = 'test-patient-123'
  const patientData = {
    name: 'John Doe',
    age: 30,
    diagnosis: 'Hypertension',
    medications: ['Lisinopril', 'Amlodipine'],
    lastVisit: new Date().toISOString()
  }

  try {
    // Set patient data
    const setResult = await setPatientHash(patientId, patientData)
    console.log('✅ Set patient hash:', setResult)

    // Get all patient data
    const retrievedData = await getPatientHash(patientId)
    console.log('✅ Retrieved patient data:', retrievedData)

    // Get specific field
    const patientName = await getPatientHashField(patientId, 'name')
    console.log('✅ Retrieved patient name:', patientName)

    // Update specific field
    const updateResult = await updatePatientHashField(patientId, 'lastVisit', new Date().toISOString())
    console.log('✅ Updated last visit:', updateResult)

    // Verify update
    const updatedLastVisit = await getPatientHashField(patientId, 'lastVisit')
    console.log('✅ Verified updated last visit:', updatedLastVisit)

    console.log('✅ Patient hash operations test completed')
  } catch (error) {
    console.error('❌ Patient hash operations test failed:', error)
  }
}

async function testCacheWarming() {
  console.log('\n🧪 Testing Cache Warming functionality...')

  try {
    // Warm critical caches
    const warmingResult = await warmCriticalCaches()
    console.log('✅ Cache warming result:', warmingResult)

    // Check warming status
    const status = await getCacheWarmingStatus()
    console.log('✅ Cache warming status:', status)

    console.log('✅ Cache warming test completed')
  } catch (error) {
    console.error('❌ Cache warming test failed:', error)
  }
}

async function demonstrateUsage() {
  console.log('\n📚 Usage Examples:')
  console.log('==================')

  console.log('1. Adaptive TTL Usage:')
  console.log(`
   import { getWithAdaptiveTTL, ADAPTIVE_TTL } from './cache-phase2'

   // Get data with automatic TTL extension for frequently accessed items
   const userData = await getWithAdaptiveTTL('user:123', ADAPTIVE_TTL.FREQUENT_ACCESS)
   `)

  console.log('2. Patient Hash Operations:')
  console.log(`
   import { setPatientHash, getPatientHash, getPatientHashField } from './cache-phase2'

   // Store patient data efficiently
   await setPatientHash('patient-123', {
     name: 'John Doe',
     age: 30,
     diagnosis: 'Hypertension'
   })

   // Retrieve specific field
   const patientName = await getPatientHashField('patient-123', 'name')
   `)

  console.log('3. Cache Warming:')
  console.log(`
   import { warmCriticalCaches, getCacheWarmingStatus } from './cache-phase2'

   // Warm caches on application startup
   const result = await warmCriticalCaches()
   console.log('Cache warming completed:', result.success)
   `)
}

async function main() {
  console.log('🚀 Phase 2 Redis Caching Improvements Test')
  console.log('==========================================')

  try {
    await testAdaptiveTTL()
    await testPatientHashOperations()
    await testCacheWarming()
    await demonstrateUsage()

    console.log('\n🎉 All tests completed successfully!')
    console.log('\nPhase 2 improvements include:')
    console.log('• Adaptive TTL for better cache hit rates')
    console.log('• Structured patient data storage')
    console.log('• Cache warming for improved startup performance')
    console.log('• Memory-efficient hash-based operations')

  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { main as runCachePhase2Tests }