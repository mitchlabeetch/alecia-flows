import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { PipedriveIcon } from "./icon";

const pipedrivePlugin: IntegrationPlugin = {
  type: "pipedrive",
  label: "Pipedrive",
  description: "Manage deals, contacts, and activities in Pipedrive CRM",

  icon: PipedriveIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "Your Pipedrive API key",
      configKey: "apiKey",
      envVar: "PIPEDRIVE_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "app.pipedrive.com/settings/api",
        url: "https://app.pipedrive.com/settings/api",
      },
    },
    {
      id: "companyDomain",
      label: "Company Domain",
      type: "text",
      placeholder: "your-company",
      configKey: "companyDomain",
      envVar: "PIPEDRIVE_COMPANY_DOMAIN",
      helpText: "Your company's Pipedrive subdomain",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testPipedrive } = await import("./test");
      return testPipedrive;
    },
  },

  actions: [
    {
      slug: "create-deal",
      label: "Create Deal",
      description: "Create a new deal in Pipedrive",
      category: "Pipedrive",
      stepFunction: "createPipedriveDealStep",
      stepImportPath: "create-deal",
      outputFields: [
        { field: "id", description: "Deal ID" },
        { field: "title", description: "Deal title" },
        { field: "status", description: "Deal status" },
        { field: "value", description: "Deal value" },
      ],
      configFields: [
        {
          key: "dealTitle",
          label: "Deal Title",
          type: "template-input",
          placeholder: "Acquisition - {{Company.name}}",
          example: "Acquisition - Company XYZ",
          required: true,
        },
        {
          key: "dealValue",
          label: "Value",
          type: "template-input",
          placeholder: "1000000",
          example: "1000000",
        },
        {
          key: "dealStage",
          label: "Pipeline Stage",
          type: "text",
          placeholder: "Stage ID",
          example: "1",
        },
        {
          key: "dealPersonId",
          label: "Contact ID",
          type: "template-input",
          placeholder: "{{Contact.id}}",
          example: "123",
        },
        {
          key: "dealOrgId",
          label: "Organization ID",
          type: "template-input",
          placeholder: "{{Organization.id}}",
          example: "456",
        },
      ],
    },
    {
      slug: "search-deals",
      label: "Search Deals",
      description: "Search for deals in Pipedrive",
      category: "Pipedrive",
      stepFunction: "searchPipedriveDealsStep",
      stepImportPath: "search-deals",
      outputFields: [
        { field: "deals", description: "List of matching deals" },
        { field: "count", description: "Number of deals" },
      ],
      configFields: [
        {
          key: "searchTerm",
          label: "Search term",
          type: "template-input",
          placeholder: "Company or deal name",
          example: "Acquisition",
          required: true,
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "open", label: "Open" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
            { value: "all_not_deleted", label: "All" },
          ],
          defaultValue: "open",
        },
      ],
    },
    {
      slug: "create-contact",
      label: "Create Contact",
      description: "Create a new contact in Pipedrive",
      category: "Pipedrive",
      stepFunction: "createPipedriveContactStep",
      stepImportPath: "create-contact",
      outputFields: [
        { field: "id", description: "Contact ID" },
        { field: "name", description: "Contact name" },
        { field: "email", description: "Contact email" },
      ],
      configFields: [
        {
          key: "contactName",
          label: "Full name",
          type: "template-input",
          placeholder: "Jane Smith",
          example: "Jane Smith",
          required: true,
        },
        {
          key: "contactEmail",
          label: "Email",
          type: "template-input",
          placeholder: "jane.smith@company.com",
          example: "jane.smith@company.com",
        },
        {
          key: "contactPhone",
          label: "Phone",
          type: "template-input",
          placeholder: "+1 555 123 4567",
          example: "+1 555 123 4567",
        },
        {
          key: "contactOrgId",
          label: "Organization ID",
          type: "template-input",
          placeholder: "{{Organization.id}}",
          example: "456",
        },
      ],
    },
    {
      slug: "add-note",
      label: "Add Note",
      description: "Add a note to a deal or contact in Pipedrive",
      category: "Pipedrive",
      stepFunction: "addPipedriveNoteStep",
      stepImportPath: "add-note",
      outputFields: [
        { field: "id", description: "Note ID" },
        { field: "content", description: "Note content" },
      ],
      configFields: [
        {
          key: "noteContent",
          label: "Note content",
          type: "template-textarea",
          placeholder: "Notes about this deal...",
          rows: 4,
          example: "Follow-up call completed on {{Date.today}}",
          required: true,
        },
        {
          key: "dealId",
          label: "Deal ID (optional)",
          type: "template-input",
          placeholder: "{{Deal.id}}",
          example: "789",
        },
        {
          key: "personId",
          label: "Contact ID (optional)",
          type: "template-input",
          placeholder: "{{Contact.id}}",
          example: "123",
        },
      ],
    },
    {
      slug: "update-deal",
      label: "Update Deal",
      description: "Update an existing deal in Pipedrive",
      category: "Pipedrive",
      stepFunction: "updatePipedriveDealStep",
      stepImportPath: "update-deal",
      outputFields: [
        { field: "id", description: "Deal ID" },
        { field: "title", description: "Deal title" },
        { field: "status", description: "Deal status" },
      ],
      configFields: [
        {
          key: "dealId",
          label: "Deal ID",
          type: "template-input",
          placeholder: "{{Deal.id}}",
          example: "789",
          required: true,
        },
        {
          key: "dealTitle",
          label: "New title",
          type: "template-input",
          placeholder: "Acquisition - {{Company.name}}",
          example: "Acquisition - Company XYZ",
        },
        {
          key: "dealValue",
          label: "New value",
          type: "template-input",
          placeholder: "2000000",
          example: "2000000",
        },
        {
          key: "dealStatus",
          label: "New status",
          type: "select",
          options: [
            { value: "open", label: "Open" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ],
        },
      ],
    },
  ],
};

registerIntegration(pipedrivePlugin);
export default pipedrivePlugin;
