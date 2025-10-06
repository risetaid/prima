#!/usr/bin/env bun
/**
 * Connection Testing Script for Railway Pro
 * Tests Redis and PostgreSQL connections with latency measurements
 */

import { redis } from '@/lib/redis'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function testConnections() {
  console.log('🔍 Testing Railway Pro Connections...\n')
  console.log('=' .repeat(60))
  
  let allHealthy = true

  // Test Redis Connection
  console.log('\n📦 REDIS CONNECTION TEST')
  console.log('-'.repeat(60))
  try {
    const start = Date.now()
    const pingResult = await redis.ping()
    const latency = Date.now() - start
    
    if (pingResult.success) {
      console.log('✅ Redis: Connected')
      console.log(`   Latency: ${pingResult.latency}ms (ping)`)
      console.log(`   Total: ${latency}ms (round-trip)`)
      
      // Get connection status
      const status = redis.getStatus()
      console.log(`   Status: ${status.status}`)
      console.log(`   Cluster: ${status.cluster ? 'Yes' : 'No'}`)
      
      // Test basic operations
      const testKey = 'health_check_test'
      await redis.set(testKey, 'ok', 10)
      const value = await redis.get(testKey)
      await redis.del(testKey)
      
      if (value === 'ok') {
        console.log('   Operations: SET/GET/DEL working ✓')
      } else {
        console.log('   Operations: Failed ✗')
        allHealthy = false
      }
    } else {
      console.log('❌ Redis: Failed to connect')
      console.log(`   Attempted in: ${latency}ms`)
      allHealthy = false
    }
  } catch (error) {
    console.error('❌ Redis: Error', error instanceof Error ? error.message : String(error))
    allHealthy = false
  }

  // Test PostgreSQL Connection
  console.log('\n🐘 POSTGRESQL CONNECTION TEST')
  console.log('-'.repeat(60))
  try {
    const start = Date.now()
    
    // Test basic query
    const result = await db.execute(sql`
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_addr,
        inet_server_port() as server_port
    `)
    
    const latency = Date.now() - start
    
    console.log('✅ Database: Connected')
    console.log(`   Latency: ${latency}ms`)
    
    if (result && result.length > 0) {
      const info = result[0] as any
      console.log(`   PostgreSQL: ${info.version?.split(' ')[0]} ${info.version?.split(' ')[1]}`)
      console.log(`   Database: ${info.database}`)
      console.log(`   User: ${info.user}`)
      console.log(`   Server: ${info.server_addr || 'unix socket'}:${info.server_port || 'n/a'}`)
    }
    
    // Test connection pool
    const poolTest = await db.execute(sql`
      SELECT 
        count(*) as active_connections,
        max(application_name) as app_name
      FROM pg_stat_activity 
      WHERE application_name = 'prima_nextjs'
    `)
    
    if (poolTest && poolTest.length > 0) {
      const poolInfo = poolTest[0] as any
      console.log(`   Active Connections: ${poolInfo.active_connections}`)
      console.log(`   Application: ${poolInfo.app_name || 'prima_nextjs'}`)
    }
    
  } catch (error) {
    console.error('❌ Database: Error', error instanceof Error ? error.message : String(error))
    allHealthy = false
  }

  // Test Application Health Endpoint
  console.log('\n🏥 HEALTH ENDPOINT TEST')
  console.log('-'.repeat(60))
  try {
    const port = process.env.PORT || 3000
    const url = `http://localhost:${port}/api/health`
    
    console.log(`   Testing: ${url}`)
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Health Endpoint: Responding')
      console.log(`   Status: ${data.status}`)
      if (data.checks) {
        console.log(`   Redis: ${data.checks.redis?.status} (${data.checks.redis?.latency}ms)`)
        console.log(`   Database: ${data.checks.database?.status} (${data.checks.database?.latency}ms)`)
      }
    } else {
      console.log('⚠️  Health Endpoint: Not healthy')
      console.log(`   Status: ${data.status}`)
    }
  } catch (error) {
    console.log('ℹ️  Health Endpoint: Not running (start dev server first)')
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  if (allHealthy) {
    console.log('✅ ALL SYSTEMS OPERATIONAL - Railway Pro')
    console.log('\n🚀 Ready to deploy!')
    process.exit(0)
  } else {
    console.log('❌ SOME SYSTEMS FAILED')
    console.log('\n⚠️  Please check configuration before deploying')
    process.exit(1)
  }
}

// Run tests
testConnections().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error)
  process.exit(1)
})
