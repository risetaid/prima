import { db } from './src/db';
import { patients } from './src/db';
import { eq } from 'drizzle-orm';

async function checkPatientStatus() {
  const phoneNumber = '081333852187';

  try {
    console.log(`Checking patient status for phone: ${phoneNumber}`);

    // Find patient by phone
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.phoneNumber, phoneNumber))
      .limit(1);

    if (patient.length === 0) {
      console.log('No patient found with this phone number');
      return;
    }

    const p = patient[0];
    console.log('Patient details:', {
      id: p.id,
      name: p.name,
      phoneNumber: p.phoneNumber,
      verificationStatus: p.verificationStatus,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });

  } catch (error) {
    console.error('Error checking patient status:', error);
  } finally {
    process.exit(0);
  }
}

checkPatientStatus();