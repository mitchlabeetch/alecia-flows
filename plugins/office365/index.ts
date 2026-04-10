import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { Office365Icon } from "./icon";

const office365Plugin: IntegrationPlugin = {
  type: "office365",
  label: "Office 365",
  description:
    "Créez et gérez des documents Excel, Word, PowerPoint et OneNote via Microsoft Graph API",

  icon: Office365Icon,

  formFields: [
    {
      id: "tenantId",
      label: "ID du tenant Azure",
      type: "text",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      configKey: "tenantId",
      envVar: "OFFICE365_TENANT_ID",
      helpText: "Trouvez votre Tenant ID dans le portail Azure",
    },
    {
      id: "clientId",
      label: "ID de l'application (client)",
      type: "text",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      configKey: "clientId",
      envVar: "OFFICE365_CLIENT_ID",
      helpText: "L'ID de votre application Azure AD",
    },
    {
      id: "clientSecret",
      label: "Secret client",
      type: "password",
      placeholder: "Votre secret client",
      configKey: "clientSecret",
      envVar: "OFFICE365_CLIENT_SECRET",
      helpText: "Créez un secret dans votre application Azure AD",
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
      label: "Créer un classeur Excel",
      description: "Créer un nouveau classeur Excel dans OneDrive",
      category: "Office 365",
      stepFunction: "createExcelWorkbookStep",
      stepImportPath: "create-excel-workbook",
      outputFields: [
        { field: "id", description: "ID du fichier" },
        { field: "name", description: "Nom du fichier" },
        { field: "webUrl", description: "URL d'accès" },
      ],
      configFields: [
        {
          key: "fileName",
          label: "Nom du fichier",
          type: "template-input",
          placeholder: "Analyse_{{Deal.title}}.xlsx",
          example: "Analyse_Acquisition.xlsx",
          required: true,
        },
        {
          key: "folderPath",
          label: "Dossier (optionnel)",
          type: "template-input",
          placeholder: "/Documents/M&A",
          example: "/Documents/M&A",
        },
      ],
    },
    {
      slug: "add-excel-row",
      label: "Ajouter une ligne Excel",
      description: "Ajouter une ligne de données dans un tableau Excel",
      category: "Office 365",
      stepFunction: "addExcelRowStep",
      stepImportPath: "add-excel-row",
      outputFields: [
        { field: "rowIndex", description: "Index de la ligne ajoutée" },
      ],
      configFields: [
        {
          key: "fileId",
          label: "ID du fichier Excel",
          type: "template-input",
          placeholder: "{{CreateExcel.id}}",
          example: "01BYE5RZ...",
          required: true,
        },
        {
          key: "worksheetName",
          label: "Nom de la feuille",
          type: "template-input",
          placeholder: "Feuil1",
          example: "Données",
          defaultValue: "Feuil1",
        },
        {
          key: "tableName",
          label: "Nom du tableau (requis dans Excel)",
          type: "template-input",
          placeholder: "Table1",
          example: "Table1",
          defaultValue: "Table1",
        },
        {
          key: "rowData",
          label: "Données (JSON tableau)",
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
      label: "Créer un document Word",
      description: "Créer un nouveau document Word dans OneDrive",
      category: "Office 365",
      stepFunction: "createWordDocumentStep",
      stepImportPath: "create-word-document",
      outputFields: [
        { field: "id", description: "ID du fichier" },
        { field: "name", description: "Nom du fichier" },
        { field: "webUrl", description: "URL d'accès" },
      ],
      configFields: [
        {
          key: "fileName",
          label: "Nom du document",
          type: "template-input",
          placeholder: "Note_de_synthese_{{Deal.title}}.docx",
          example: "Note_de_synthese_Acquisition.docx",
          required: true,
        },
        {
          key: "content",
          label: "Contenu initial",
          type: "template-textarea",
          placeholder: "Titre: {{Deal.title}}\n\nRésumé exécutif...",
          rows: 6,
          example: "Note de synthèse - Acquisition XYZ",
        },
        {
          key: "folderPath",
          label: "Dossier (optionnel)",
          type: "template-input",
          placeholder: "/Documents/M&A",
          example: "/Documents/M&A",
        },
      ],
    },
    {
      slug: "create-powerpoint",
      label: "Créer une présentation PowerPoint",
      description: "Créer une nouvelle présentation PowerPoint dans OneDrive",
      category: "Office 365",
      stepFunction: "createPowerPointStep",
      stepImportPath: "create-powerpoint",
      outputFields: [
        { field: "id", description: "ID du fichier" },
        { field: "name", description: "Nom du fichier" },
        { field: "webUrl", description: "URL d'accès" },
      ],
      configFields: [
        {
          key: "fileName",
          label: "Nom de la présentation",
          type: "template-input",
          placeholder: "Presentation_{{Deal.title}}.pptx",
          example: "Presentation_Acquisition.pptx",
          required: true,
        },
        {
          key: "folderPath",
          label: "Dossier (optionnel)",
          type: "template-input",
          placeholder: "/Documents/M&A",
          example: "/Documents/M&A",
        },
      ],
    },
    {
      slug: "create-onenote-page",
      label: "Créer une page OneNote",
      description: "Créer une nouvelle page dans un bloc-notes OneNote",
      category: "Office 365",
      stepFunction: "createOneNotePageStep",
      stepImportPath: "create-onenote-page",
      outputFields: [
        { field: "id", description: "ID de la page" },
        { field: "title", description: "Titre de la page" },
        { field: "webUrl", description: "URL d'accès" },
      ],
      configFields: [
        {
          key: "notebookName",
          label: "Nom du bloc-notes",
          type: "template-input",
          placeholder: "Dossiers M&A",
          example: "Dossiers M&A",
          required: true,
        },
        {
          key: "sectionName",
          label: "Nom de la section",
          type: "template-input",
          placeholder: "{{Deal.title}}",
          example: "Acquisition XYZ",
          required: true,
        },
        {
          key: "pageTitle",
          label: "Titre de la page",
          type: "template-input",
          placeholder: "Notes - {{Date.today}}",
          example: "Notes de due diligence",
          required: true,
        },
        {
          key: "pageContent",
          label: "Contenu HTML",
          type: "template-textarea",
          placeholder:
            "<h1>{{pageTitle}}</h1><p>{{Deal.description}}</p>",
          rows: 6,
          example:
            "<h1>Due Diligence</h1><p>Points clés à examiner...</p>",
        },
      ],
    },
    {
      slug: "send-email",
      label: "Envoyer un Email",
      description: "Envoyer un email via Microsoft Outlook",
      category: "Office 365",
      stepFunction: "sendOutlookEmailStep",
      stepImportPath: "send-email",
      outputFields: [
        { field: "messageId", description: "ID du message envoyé" },
      ],
      configFields: [
        {
          key: "to",
          label: "Destinataire(s)",
          type: "template-input",
          placeholder: "contact@entreprise.fr, {{Deal.contactEmail}}",
          example: "contact@entreprise.fr",
          required: true,
        },
        {
          key: "subject",
          label: "Objet",
          type: "template-input",
          placeholder: "Dossier {{Deal.title}} - Mise à jour",
          example: "Dossier Acquisition XYZ - Prochaines étapes",
          required: true,
        },
        {
          key: "body",
          label: "Corps du message",
          type: "template-textarea",
          placeholder:
            "Bonjour,\n\nSuite à notre échange concernant {{Deal.title}}...",
          rows: 8,
          example:
            "Bonjour,\n\nNous revenons vers vous concernant votre dossier.",
          required: true,
        },
        {
          key: "cc",
          label: "Copie (CC)",
          type: "template-input",
          placeholder: "manager@alecia.fr",
          example: "manager@alecia.fr",
        },
      ],
    },
  ],
};

registerIntegration(office365Plugin);
export default office365Plugin;
