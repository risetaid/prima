// HealthNoteService centralizes Catatan Kesehatan CRUD with permissions and transforms
import { PatientRepository } from './patient.repository'
import { CreateHealthNoteDTO, UpdateHealthNoteDTO, HealthNoteDTO, ValidationError, NotFoundError, UnauthorizedError } from './patient.types'

export class HealthNoteService {
  private repo: PatientRepository
  constructor() {
    this.repo = new PatientRepository()
  }

  // List health notes for a patient (includes inactive patients, excludes soft-deleted)
  async list(patientId: string): Promise<{ healthNotes: HealthNoteDTO[] }> {
    if (!patientId) throw new ValidationError('Missing patientId')

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    const rows = await this.repo.listHealthNotes(patientId)
    const userIds = Array.from(new Set(rows.map(r => r.recordedBy)))
    const users = await this.repo.getUsersByIds(userIds)
    const userMap = new Map(users.map(u => [u.id, u]))

    const notes: HealthNoteDTO[] = rows.map(r => ({
      ...r,
      recordedByUser: userMap.get(r.recordedBy) || null,
    }))

    return { healthNotes: notes }
  }

  // Get a specific health note; by default, do not enforce active patient. Pass requireActivePatient=true to match stricter routes.
  async get(patientId: string, noteId: string): Promise<HealthNoteDTO> {
    if (!patientId || !noteId) throw new ValidationError('Missing patientId or noteId')

    const note = await this.repo.getHealthNote(patientId, noteId)
    if (!note) throw new NotFoundError('Health note not found')

    const users = await this.repo.getUsersByIds([note.recordedBy])
    const recordedByUser = users[0] || null

    return { ...note, recordedByUser }
  }

  async create(patientId: string, body: CreateHealthNoteDTO, userId: string): Promise<{ healthNote: HealthNoteDTO }> {
    if (!patientId) throw new ValidationError('Missing patientId')
    if (!userId) throw new UnauthorizedError('Unauthorized')

    const { note, noteDate } = body || ({} as CreateHealthNoteDTO)
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      throw new ValidationError('Note content is required')
    }
    if (!noteDate || typeof noteDate !== 'string') {
      throw new ValidationError('Note date is required')
    }

    const exists = await this.repo.patientExists(patientId)
    if (!exists) throw new NotFoundError('Patient not found')

    const created = await this.repo.createHealthNote(patientId, note.trim(), new Date(noteDate), userId)
    const users = await this.repo.getUsersByIds([userId])

    return {
      healthNote: {
        ...created,
        recordedByUser: users[0] || null,
      },
    }
  }

  async update(patientId: string, noteId: string, body: UpdateHealthNoteDTO, currentUser: { id: string; role: string }) {
    if (!patientId || !noteId) throw new ValidationError('Missing patientId or noteId')
    if (!currentUser?.id) throw new UnauthorizedError('Unauthorized')

    const { note, noteDate } = body || ({} as UpdateHealthNoteDTO)
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      throw new ValidationError('Note content is required')
    }
    if (!noteDate || typeof noteDate !== 'string') {
      throw new ValidationError('Note date is required')
    }

    const existing = await this.repo.getHealthNote(patientId, noteId)
    if (!existing) throw new NotFoundError('Health note not found')

    // Only recorder or SUPERADMIN can edit
    if (existing.recordedBy !== currentUser.id && currentUser.role !== 'SUPERADMIN') {
      throw new UnauthorizedError('You can only edit notes you created')
    }

    const updated = await this.repo.updateHealthNote(noteId, note.trim(), new Date(noteDate))
    const users = await this.repo.getUsersByIds([updated.recordedBy])

    return {
      healthNote: {
        ...updated,
        recordedByUser: users[0] || null,
      },
    }
  }

  async delete(patientId: string, noteId: string, currentUser: { id: string; role: string }) {
    if (!patientId || !noteId) throw new ValidationError('Missing patientId or noteId')
    if (!currentUser?.id) throw new UnauthorizedError('Unauthorized')

    const existing = await this.repo.getHealthNote(patientId, noteId)
    if (!existing) throw new NotFoundError('Health note not found')

    if (existing.recordedBy !== currentUser.id && currentUser.role !== 'SUPERADMIN') {
      throw new UnauthorizedError('You can only delete notes you created')
    }

    const deletedCount = await this.repo.softDeleteHealthNote(patientId, noteId)
    return { success: true, deletedCount }
  }

  async bulkDelete(patientId: string, noteIds: string[], currentUser: { id: string; role: string }) {
    if (!patientId) throw new ValidationError('Missing patientId')
    if (!Array.isArray(noteIds) || noteIds.length === 0) throw new ValidationError('Note IDs are required')
    if (!currentUser?.id) throw new UnauthorizedError('Unauthorized')

    // Check ownership for each note
    // Fetch notes (not deleted) then filter permissions
    const notes = await this.repo.listHealthNotes(patientId)
    const notesToDelete = notes.filter(n => noteIds.includes(n.id))

    if (notesToDelete.length !== noteIds.length) {
      throw new NotFoundError('Some health notes not found')
    }

    const unauthorized = notesToDelete.filter(n => n.recordedBy !== currentUser.id && currentUser.role !== 'SUPERADMIN')
    if (unauthorized.length > 0) {
      throw new UnauthorizedError('You can only delete notes you created')
    }

    const deletedCount = await this.repo.softDeleteHealthNotes(patientId, noteIds)
    return { success: true, deletedCount }
  }
}


