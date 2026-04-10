import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { NotionIcon } from "./icon";

const notionPlugin: IntegrationPlugin = {
  type: "notion",
  label: "Notion",
  description:
    "Create and manage pages, databases, and entries in Notion",

  icon: NotionIcon,

  formFields: [
    {
      id: "apiKey",
      label: "Clé API Notion",
      type: "password",
      placeholder: "secret_...",
      configKey: "apiKey",
      envVar: "NOTION_API_KEY",
      helpText: "Créez une intégration sur ",
      helpLink: {
        text: "notion.so/my-integrations",
        url: "https://www.notion.so/my-integrations",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testNotion } = await import("./test");
      return testNotion;
    },
  },

  actions: [
    {
      slug: "create-page",
      label: "Create Page",
      description: "Create a new page in a Notion workspace",
      category: "Notion",
      stepFunction: "createNotionPageStep",
      stepImportPath: "create-page",
      outputFields: [
         { field: "id", description: "Page ID" },
         { field: "url", description: "Page URL" },
         { field: "title", description: "Page title" },
      ],
      configFields: [
        {
          key: "parentId",
          label: "ID de la page parente",
          type: "template-input",
          placeholder: "ID de la page ou base de données parente",
          example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          required: true,
        },
        {
          key: "title",
          label: "Titre",
          type: "template-input",
          placeholder: "Dossier {{Deal.title}}",
          example: "Dossier Acquisition XYZ",
          required: true,
        },
        {
          key: "content",
          label: "Contenu (texte simple)",
          type: "template-textarea",
          placeholder:
            "Description du dossier...\n\nPoints clés :\n- {{Deal.keyPoint1}}",
          rows: 6,
          example: "Analyse préliminaire du dossier d'acquisition.",
        },
      ],
    },
    {
      slug: "add-database-entry",
      label: "Add Database Entry",
      description: "Add a new entry to a Notion database",
      category: "Notion",
      stepFunction: "addNotionDatabaseEntryStep",
      stepImportPath: "add-database-entry",
      outputFields: [
         { field: "id", description: "Entry ID" },
         { field: "url", description: "Entry URL" },
      ],
      configFields: [
        {
          key: "databaseId",
          label: "ID de la base de données",
          type: "template-input",
          placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          required: true,
        },
        {
          key: "properties",
          label: "Propriétés (JSON)",
          type: "template-textarea",
          placeholder:
            '{"Nom": {"title": [{"text": {"content": "{{Deal.title}}"}}]}, "Statut": {"select": {"name": "En cours"}}}',
          rows: 8,
          example:
            '{"Nom": {"title": [{"text": {"content": "Acquisition XYZ"}}]}}',
          required: true,
        },
      ],
    },
    {
      slug: "search-pages",
      label: "Search Pages",
      description: "Search for pages in a Notion workspace",
      category: "Notion",
      stepFunction: "searchNotionPagesStep",
      stepImportPath: "search-pages",
      outputFields: [
         { field: "pages", description: "List of matching pages" },
         { field: "count", description: "Result count" },
      ],
      configFields: [
        {
          key: "query",
          label: "Requête de recherche",
          type: "template-input",
          placeholder: "{{Deal.title}}",
          example: "Acquisition",
          required: true,
        },
        {
          key: "filterType",
          label: "Type de résultat",
          type: "select",
          options: [
            { value: "page", label: "Pages" },
            { value: "database", label: "Bases de données" },
          ],
          defaultValue: "page",
        },
      ],
    },
    {
      slug: "append-block",
      label: "Append Page Content",
      description: "Append content blocks to an existing Notion page",
      category: "Notion",
      stepFunction: "appendNotionBlockStep",
      stepImportPath: "append-block",
      outputFields: [
         { field: "blockIds", description: "Added block IDs" },
      ],
      configFields: [
        {
          key: "pageId",
          label: "ID de la page",
          type: "template-input",
          placeholder: "{{CreatePage.id}}",
          example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          required: true,
        },
        {
          key: "content",
          label: "Contenu à ajouter",
          type: "template-textarea",
          placeholder:
            "Texte à ajouter à la page...\n\nPour les listes, commencez par - ",
          rows: 6,
          example:
            "Mise à jour du dossier:\n- Réunion effectuée\n- Documents reçus",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(notionPlugin);
export default notionPlugin;
