import apiFetch from "./apiFetch";

// ADMIN - Form Management
export const getFormFields = (processId) =>
  apiFetch(`/forms/get_fms_form_fields.php?process_id=${processId}`);

export const getFormDetails = (formId) =>
  apiFetch(`/forms/get_form_details.php?form_id=${formId}`);

export const createForm = (payload) =>
  apiFetch('/forms/create_form.php', {
    method: 'POST',
    body: payload,
  });

export const updateForm = (formId, payload) =>
  apiFetch('/forms/update_form.php', {
    method: 'POST',
    body: { form_id: formId, ...payload },
  });

export const createFormField = (payload) =>
  apiFetch('/forms/create_form_field.php', {
    method: 'POST',
    body: payload,
  });

export const updateFormField = (fieldId, payload) =>
  apiFetch('/forms/update_form_field.php', {
    method: 'POST',
    body: { field_id: fieldId, ...payload },
  });

// USER - Form Submission
export const createFormSubmission = (processId) =>
  apiFetch('/forms/create_fms_form_submission.php', {
    method: 'POST',
    body: { process_id: processId },
  });

export const saveFormValues = (submissionId, values) =>
  apiFetch('/forms/create_fms_form_submission_values.php', {
    method: 'POST',
    body: {
      submission_id: submissionId,
      values,
    },
  });

export const createFmsInstance = (submissionId) =>
  apiFetch('/forms/create_instance_from_submission.php', {
    method: 'POST',
    body: { submission_id: submissionId },
  });