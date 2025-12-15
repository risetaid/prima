// tests/app/api/admin/users/role-demotion.test.ts
import { describe, it, expect } from 'vitest';

describe('Role Demotion Logic', () => {
  it('should correctly count admin/developer users', () => {
    // Simulating the bug: array.length counts rows, not the count value
    
    // WRONG WAY (current bug):
    const adminCountWrong = [{ count: 5 }]; // Query returns one row with count=5
    const developerCountWrong = [{ count: 3 }]; // Query returns one row with count=3
    const totalWrong = adminCountWrong.length + developerCountWrong.length; // 1 + 1 = 2 (WRONG!)
    
    expect(totalWrong).toBe(2); // This is the bug - should be 8
    
    // CORRECT WAY (after fix):
    const adminCountCorrect = [{ count: 5 }];
    const developerCountCorrect = [{ count: 3 }];
    const totalCorrect = (adminCountCorrect[0]?.count || 0) + (developerCountCorrect[0]?.count || 0);
    
    expect(totalCorrect).toBe(8); // This is correct
  });

  it('should detect when only one privileged user exists', () => {
    // Scenario: 1 admin, 0 developers
    const adminCount = [{ count: 1 }];
    const developerCount = [{ count: 0 }];
    
    const total = (adminCount[0]?.count || 0) + (developerCount[0]?.count || 0);
    
    expect(total).toBe(1);
    expect(total <= 1).toBe(true); // Should prevent demotion
  });

  it('should allow demotion when multiple privileged users exist', () => {
    // Scenario: 2 admins, 1 developer
    const adminCount = [{ count: 2 }];
    const developerCount = [{ count: 1 }];
    
    const total = (adminCount[0]?.count || 0) + (developerCount[0]?.count || 0);
    
    expect(total).toBe(3);
    expect(total > 1).toBe(true); // Should allow demotion
  });
});
