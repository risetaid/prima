// Query optimization utilities to prevent performance degradation
export function createDateRangeQuery(dateString: string, timezone: string = '+07:00') {
  // Create proper timezone-aware date range query
  const startOfDay = new Date(`${dateString}T00:00:00.000${timezone}`)
  const endOfDay = new Date(`${dateString}T23:59:59.999${timezone}`)
  
  return {
    gte: startOfDay,
    lte: endOfDay
  }
}

export function createEfficientPagination(page: number = 1, limit: number = 50) {
  const offset = Math.max(0, (page - 1) * limit)
  const take = Math.min(100, Math.max(1, limit)) // Cap at 100 items
  
  return {
    skip: offset,
    take: take
  }
}

// Optimized where clause builder
export class WhereClauseBuilder {
  private conditions: any[] = []
  
  addCondition(condition: any): this {
    if (condition && typeof condition === 'object') {
      this.conditions.push(condition)
    }
    return this
  }
  
  addSearch(searchTerm: string, fields: string[]): this {
    if (searchTerm && searchTerm.trim()) {
      const sanitizedSearch = searchTerm.trim().replace(/[^a-zA-Z0-9\s]/g, '')
      if (sanitizedSearch) {
        const searchConditions = fields.map(field => ({
          [field]: { contains: sanitizedSearch, mode: 'insensitive' as const }
        }))
        this.conditions.push({ OR: searchConditions })
      }
    }
    return this
  }
  
  addDateRange(field: string, dateString: string, timezone: string = '+07:00'): this {
    if (dateString) {
      this.conditions.push({
        [field]: createDateRangeQuery(dateString, timezone)
      })
    }
    return this
  }
  
  addBoolean(field: string, value: any): this {
    if (value !== undefined && value !== null) {
      const boolValue = value === 'true' || value === true || value === 1
      this.conditions.push({ [field]: boolValue })
    }
    return this
  }
  
  build(): any {
    if (this.conditions.length === 0) {
      return {}
    }
    if (this.conditions.length === 1) {
      return this.conditions[0]
    }
    return { AND: this.conditions }
  }
}

// Memory-efficient batch processing
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
    
    // Prevent memory buildup - add small delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  return results
}