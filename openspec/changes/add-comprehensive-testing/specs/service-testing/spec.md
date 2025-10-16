## ADDED Requirements

### Requirement: Service Unit Testing
The system SHALL provide unit tests for core business logic services.

#### Scenario: PatientService retrieves patient by ID
- **WHEN** PatientService.getById() is called with valid ID
- **THEN** patient record is returned with all fields

#### Scenario: PatientService returns not found
- **WHEN** PatientService.getById() is called with invalid ID
- **THEN** service returns null or throws NotFoundError

#### Scenario: ReminderService creates scheduled reminder
- **WHEN** ReminderService.create() is called with valid data
- **THEN** reminder is created with SCHEDULED status and correct schedule

#### Scenario: ReminderService validates reminder data
- **WHEN** ReminderService.create() is called with invalid data
- **THEN** service throws ValidationError with field details

#### Scenario: VerificationService processes valid response
- **WHEN** VerificationService.processResponse() receives valid confirmation
- **THEN** service returns action:verified and updates status

#### Scenario: VerificationService rejects invalid response
- **WHEN** VerificationService.processResponse() receives invalid input
- **THEN** service returns action:rejected with reason

### Requirement: Repository Pattern Testing
The system SHALL test repository layer data access operations.

#### Scenario: PatientRepository.find() filters correctly
- **WHEN** PatientRepository.find() is called with filters
- **THEN** only matching records are returned

#### Scenario: PatientRepository.insert() creates record
- **WHEN** PatientRepository.insert() is called with valid data
- **THEN** record is created and returned with generated ID

#### Scenario: ReminderRepository.update() modifies record
- **WHEN** ReminderRepository.update() is called with ID and changes
- **THEN** record is updated with new values

### Requirement: Error Handling in Services
The system SHALL properly handle and propagate errors from services.

#### Scenario: Service throws ValidationError
- **WHEN** service receives invalid input
- **THEN** ValidationError is thrown with descriptive message

#### Scenario: Service throws NotFoundError
- **WHEN** service cannot find requested resource
- **THEN** NotFoundError is thrown with resource identifier

#### Scenario: Service handles database errors
- **WHEN** database operation fails
- **THEN** service catches and re-throws as appropriate domain error

### Requirement: Service Integration Testing
The system SHALL test services working together.

#### Scenario: Patient creation and verification works end-to-end
- **WHEN** patient is created and verification is initiated
- **THEN** correct operations are called in order

#### Scenario: Reminder creation and confirmation flow works
- **WHEN** reminder is created and patient sends confirmation
- **THEN** services coordinate to update statuses correctly

### Requirement: Caching in Services
The system SHALL test that service caching works correctly.

#### Scenario: Service caches query results
- **WHEN** same query is made twice
- **THEN** second query returns cached result

#### Scenario: Cache is invalidated on update
- **WHEN** service updates a record
- **THEN** related cache entries are cleared
