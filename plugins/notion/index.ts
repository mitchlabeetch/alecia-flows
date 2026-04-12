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
      label: "Notion API Key",
      type: "password",
      placeholder: "secret_...",
      configKey: "apiKey",
      envVar: "NOTION_API_KEY",
      helpText: "Create an integration at ",
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
          label: "Parent Page ID",
          type: "template-input",
          placeholder: "Parent page or database ID",
          example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          required: true,
        },
        {
          key: "title",
          label: "Title",
          type: "template-input",
          placeholder: "Folder {{Deal.title}}",
          example: "Acquisition XYZ Folder",
          required: true,
        },
        {
          key: "content",
          label: "Content (plain text)",
          type: "template-textarea",
          placeholder:
            "Folder description...\n\nKey points:\n- {{Deal.keyPoint1}}",
          rows: 6,
          example: "Preliminary analysis of the acquisition deal.",
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
          label: "Database ID",
          type: "template-input",
          placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          required: true,
        },
        {
          key: "properties",
          label: "Properties (JSON)",
          type: "template-textarea",
          placeholder:
            '{"Name": {"title": [{"text": {"content": "{{Deal.title}}"}}]}, "Status": {"select": {"name": "In progress"}}}',
          rows: 8,
          example:
            '{"Name": {"title": [{"text": {"content": "Acquisition XYZ"}}]}}',
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
          label: "Search query",
          type: "template-input",
          placeholder: "{{Deal.title}}",
          example: "Acquisition",
          required: true,
        },
        {
          key: "filterType",
          label: "Result type",
          type: "select",
          options: [
            { value: "page", label: "Pages" },
            { value: "database", label: "Databases" },
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
          label: "Page ID",
          type: "template-input",
          placeholder: "{{CreatePage.id}}",
          example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
          required: true,
        },
        {
          key: "content",
          label: "Content to append",
          type: "template-textarea",
          placeholder:
            "Text to add to the page...\n\nFor lists, start with - ",
          rows: 6,
          example:
            "Deal update:\n- Follow-up call completed\n- Documents received",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(notionPlugin);
export default notionPlugin;
