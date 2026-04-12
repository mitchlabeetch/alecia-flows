import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { Office365Icon } from "./icon";

const office365Plugin: IntegrationPlugin = {
  type: "office365",
  label: "Office 365",
  description:
    "Create and manage Excel, Word, PowerPoint, and OneNote documents via Microsoft Graph API",

  icon: Office365Icon,

  formFields: [
    {
      id: "tenantId",
      label: "Azure Tenant ID",
      type: "text",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      configKey: "tenantId",
      envVar: "OFFICE365_TENANT_ID",
      helpText: "Find your Tenant ID in the Azure portal",
    },
    {
      id: "clientId",
      label: "Application (client) ID",
      type: "text",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      configKey: "clientId",
      envVar: "OFFICE365_CLIENT_ID",
      helpText: "The ID of your Azure AD application",
    },
    {
      id: "clientSecret",
      label: "Client secret",
      type: "password",
      placeholder: "Your client secret",
      configKey: "clientSecret",
      envVar: "OFFICE365_CLIENT_SECRET",
      helpText: "Create a secret in your Azure AD application",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testOffice365 } = await import("./test");
      return testOffice365;
    },
  },

  actions: [
    {
      slug: "create-excel-workbook",
      label: "Create Excel Workbook",
      description: "Create a new Excel workbook in OneDrive",
      category: "Office 365",
      stepFunction: "createExcelWorkbookStep",
      stepImportPath: "create-excel-workbook",
      outputFields: [
        { field: "id", description: "File ID" },
        { field: "name", description: "File name" },
        { field: "webUrl", description: "Access URL" },
      ],
      configFields: [
        {
          key: "fileName",
          label: "File name",
          type: "template-input",
          placeholder: "Analysis_{{Deal.title}}.xlsx",
          example: "Analysis_Acquisition.xlsx",
          required: true,
        },
        {
          key: "folderPath",
          label: "Folder (optional)",
          type: "template-input",
          placeholder: "/Documents/M&A",
          example: "/Documents/M&A",
        },
      ],
    },
    {
      slug: "add-excel-row",
      label: "Add Excel Row",
      description: "Add a data row to an Excel table",
      category: "Office 365",
      stepFunction: "addExcelRowStep",
      stepImportPath: "add-excel-row",
      outputFields: [
        { field: "rowIndex", description: "Index of the added row" },
      ],
      configFields: [
        {
          key: "fileId",
          label: "Excel file ID",
          type: "template-input",
          placeholder: "{{CreateExcel.id}}",
          example: "01BYE5RZ...",
          required: true,
        },
        {
          key: "worksheetName",
          label: "Sheet name",
          type: "template-input",
          placeholder: "Sheet1",
          example: "Data",
          defaultValue: "Sheet1",
        },
        {
          key: "tableName",
          label: "Table name (required in Excel)",
          type: "template-input",
          placeholder: "Table1",
          example: "Table1",
          defaultValue: "Table1",
        },
        {
          key: "rowData",
          label: "Row data (JSON array)",
          type: "template-textarea",
          placeholder:
            '["{{Deal.title}}", "{{Deal.value}}", "{{Date.today}}"]',
          rows: 3,
          example: '["Acquisition XYZ", "5000000", "2024-01-15"]',
          required: true,
        },
      ],
    },
    {
      slug: "create-word-document",
      label: "Create Word Document",
      description: "Create a new Word document in OneDrive",
      category: "Office 365",
      stepFunction: "createWordDocumentStep",
      stepImportPath: "create-word-document",
      outputFields: [
        { field: "id", description: "File ID" },
        { field: "name", description: "File name" },
        { field: "webUrl", description: "Access URL" },
      ],
      configFields: [
        {
          key: "fileName",
          label: "Document name",
          type: "template-input",
          placeholder: "Executive_Summary_{{Deal.title}}.docx",
          example: "Executive_Summary_Acquisition.docx",
          required: true,
        },
        {
          key: "content",
          label: "Initial content",
          type: "template-textarea",
          placeholder: "Title: {{Deal.title}}\n\nExecutive Summary...",
          rows: 6,
          example: "Executive Summary - Acquisition XYZ",
        },
        {
          key: "folderPath",
          label: "Folder (optional)",
          type: "template-input",
          placeholder: "/Documents/M&A",
          example: "/Documents/M&A",
        },
      ],
    },
    {
      slug: "create-powerpoint",
      label: "Create PowerPoint Presentation",
      description: "Create a new PowerPoint presentation in OneDrive",
      category: "Office 365",
      stepFunction: "createPowerPointStep",
      stepImportPath: "create-powerpoint",
      outputFields: [
        { field: "id", description: "File ID" },
        { field: "name", description: "File name" },
        { field: "webUrl", description: "Access URL" },
      ],
      configFields: [
        {
          key: "fileName",
          label: "Presentation name",
          type: "template-input",
          placeholder: "Presentation_{{Deal.title}}.pptx",
          example: "Presentation_Acquisition.pptx",
          required: true,
        },
        {
          key: "folderPath",
          label: "Folder (optional)",
          type: "template-input",
          placeholder: "/Documents/M&A",
          example: "/Documents/M&A",
        },
      ],
    },
    {
      slug: "create-onenote-page",
      label: "Create OneNote Page",
      description: "Create a new page in a OneNote notebook",
      category: "Office 365",
      stepFunction: "createOneNotePageStep",
      stepImportPath: "create-onenote-page",
      outputFields: [
        { field: "id", description: "Page ID" },
        { field: "title", description: "Page title" },
        { field: "webUrl", description: "Access URL" },
      ],
      configFields: [
        {
          key: "notebookName",
          label: "Notebook name",
          type: "template-input",
          placeholder: "M&A Deals",
          example: "M&A Deals",
          required: true,
        },
        {
          key: "sectionName",
          label: "Section name",
          type: "template-input",
          placeholder: "{{Deal.title}}",
          example: "Acquisition XYZ",
          required: true,
        },
        {
          key: "pageTitle",
          label: "Page title",
          type: "template-input",
          placeholder: "Notes - {{Date.today}}",
          example: "Due diligence notes",
          required: true,
        },
        {
          key: "pageContent",
          label: "HTML content",
          type: "template-textarea",
          placeholder:
            "<h1>{{pageTitle}}</h1><p>{{Deal.description}}</p>",
          rows: 6,
          example:
            "<h1>Due Diligence</h1><p>Key items to review...</p>",
        },
      ],
    },
    {
      slug: "send-email",
      label: "Send Email",
      description: "Send an email with Microsoft Outlook",
      category: "Office 365",
      stepFunction: "sendOutlookEmailStep",
      stepImportPath: "send-email",
      outputFields: [
        { field: "messageId", description: "Sent message ID" },
      ],
      configFields: [
        {
          key: "to",
          label: "Recipient(s)",
          type: "template-input",
          placeholder: "contact@company.com, {{Deal.contactEmail}}",
          example: "contact@company.com",
          required: true,
        },
        {
          key: "subject",
          label: "Subject",
          type: "template-input",
          placeholder: "Deal {{Deal.title}} - Update",
          example: "Acquisition XYZ Deal - Next steps",
          required: true,
        },
        {
          key: "body",
          label: "Message body",
          type: "template-textarea",
          placeholder:
            "Hello,\n\nFollowing our discussion regarding {{Deal.title}}...",
          rows: 8,
          example:
            "Hello,\n\nWe are following up regarding your deal.",
          required: true,
        },
        {
          key: "cc",
          label: "CC",
          type: "template-input",
          placeholder: "manager@company.com",
          example: "manager@company.com",
        },
      ],
    },
  ],
};

registerIntegration(office365Plugin);
export default office365Plugin;
