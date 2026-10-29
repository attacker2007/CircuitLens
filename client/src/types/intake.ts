export interface IntakeFormValues {
  boardName: string;
  expectedBehavior: string;
  observedBehavior: string;
  relevantComponents: string;
  additionalNotes: string;
}

export interface IntakeFileState {
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
  sizeBytes: number;
}

export interface StagedIntakePayload {
  formData: IntakeFormValues;
  fileState: IntakeFileState;
  stagedAt: string;
}

export interface FieldValidationErrors {
  image?: string;
  expectedBehavior?: string;
  observedBehavior?: string;
}
