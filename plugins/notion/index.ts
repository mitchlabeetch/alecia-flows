import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { NotionIcon } from "./icon";

const notionPlugin: IntegrationPlugin = {
  type: "notion",
  label: "Notion",
  description:
    "Créez et gérez des pages, bases de données et entrées dans Notion",

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
      label: "Créer une Page",
      description: "Créer une nouvelle page dans un espace de travail Notion",
      category: "Notion",
      stepFunction: "createNotionPageStep",
      stepImportPath: "create-page",
      outputFields: [
        { field: "id", description: "ID de la page" },
        { field: "url", description: "URL de la page" },
        { field: "title", description: "Titre de la page" },
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
      label: "Ajouter une entrée à une base de données",
      description:
        "Ajouter une nouvelle entrée dans une base de données Notion",
      category: "Notion",
      stepFunction: "addNotionDatabaseEntryStep",
      stepImportPath: "add-database-entry",
      outputFields: [
        { field: "id", description: "ID de l'entrée" },
        { field: "url", description: "URL de l'entrée" },
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
      label: "Rechercher des Pages",
      description:
        "Rechercher des pages dans l'espace de travail Notion",
      category: "Notion",
      stepFunction: "searchNotionPagesStep",
      stepImportPath: "search-pages",
      outputFields: [
        { field: "pages", description: "Liste des pages trouvées" },
        { field: "count", description: "Nombre de résultats" },
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
      label: "Ajouter du contenu à une Page",
      description:
        "Ajouter des blocs de contenu à une page Notion existante",
      category: "Notion",
      stepFunction: "appendNotionBlockStep",
      stepImportPath: "append-block",
      outputFields: [
        { field: "blockIds", description: "IDs des blocs ajoutés" },
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
