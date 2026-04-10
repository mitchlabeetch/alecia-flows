import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { PipedriveIcon } from "./icon";

const pipedrivePlugin: IntegrationPlugin = {
  type: "pipedrive",
  label: "Pipedrive",
  description: "Gérez les deals, contacts et activités dans Pipedrive CRM",

  icon: PipedriveIcon,

  formFields: [
    {
      id: "apiKey",
      label: "Clé API",
      type: "password",
      placeholder: "Votre clé API Pipedrive",
      configKey: "apiKey",
      envVar: "PIPEDRIVE_API_KEY",
      helpText: "Obtenez votre clé API depuis ",
      helpLink: {
        text: "app.pipedrive.com/settings/api",
        url: "https://app.pipedrive.com/settings/api",
      },
    },
    {
      id: "companyDomain",
      label: "Domaine de l'entreprise",
      type: "text",
      placeholder: "votre-entreprise",
      configKey: "companyDomain",
      envVar: "PIPEDRIVE_COMPANY_DOMAIN",
      helpText: "Le sous-domaine Pipedrive de votre entreprise",
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
      label: "Créer un Deal",
      description: "Créer un nouveau deal dans Pipedrive",
      category: "Pipedrive",
      stepFunction: "createPipedriveDealStep",
      stepImportPath: "create-deal",
      outputFields: [
        { field: "id", description: "ID du deal" },
        { field: "title", description: "Titre du deal" },
        { field: "status", description: "Statut du deal" },
        { field: "value", description: "Valeur du deal" },
      ],
      configFields: [
        {
          key: "dealTitle",
          label: "Titre du deal",
          type: "template-input",
          placeholder: "Acquisition - {{Company.name}}",
          example: "Acquisition - Entreprise XYZ",
          required: true,
        },
        {
          key: "dealValue",
          label: "Valeur (€)",
          type: "template-input",
          placeholder: "1000000",
          example: "1000000",
        },
        {
          key: "dealStage",
          label: "Étape du pipeline",
          type: "text",
          placeholder: "ID de l'étape",
          example: "1",
        },
        {
          key: "dealPersonId",
          label: "ID du contact",
          type: "template-input",
          placeholder: "{{Contact.id}}",
          example: "123",
        },
        {
          key: "dealOrgId",
          label: "ID de l'organisation",
          type: "template-input",
          placeholder: "{{Organization.id}}",
          example: "456",
        },
      ],
    },
    {
      slug: "search-deals",
      label: "Rechercher des Deals",
      description: "Rechercher des deals dans Pipedrive",
      category: "Pipedrive",
      stepFunction: "searchPipedriveDealsStep",
      stepImportPath: "search-deals",
      outputFields: [
        { field: "deals", description: "Liste des deals trouvés" },
        { field: "count", description: "Nombre de deals" },
      ],
      configFields: [
        {
          key: "searchTerm",
          label: "Terme de recherche",
          type: "template-input",
          placeholder: "Nom de l'entreprise ou du deal",
          example: "Acquisition",
          required: true,
        },
        {
          key: "status",
          label: "Statut",
          type: "select",
          options: [
            { value: "open", label: "Ouvert" },
            { value: "won", label: "Gagné" },
            { value: "lost", label: "Perdu" },
            { value: "all_not_deleted", label: "Tous" },
          ],
          defaultValue: "open",
        },
      ],
    },
    {
      slug: "create-contact",
      label: "Créer un Contact",
      description: "Créer un nouveau contact (personne) dans Pipedrive",
      category: "Pipedrive",
      stepFunction: "createPipedriveContactStep",
      stepImportPath: "create-contact",
      outputFields: [
        { field: "id", description: "ID du contact" },
        { field: "name", description: "Nom du contact" },
        { field: "email", description: "Email du contact" },
      ],
      configFields: [
        {
          key: "contactName",
          label: "Nom complet",
          type: "template-input",
          placeholder: "Jean Dupont",
          example: "Jean Dupont",
          required: true,
        },
        {
          key: "contactEmail",
          label: "Email",
          type: "template-input",
          placeholder: "jean.dupont@entreprise.fr",
          example: "jean.dupont@entreprise.fr",
        },
        {
          key: "contactPhone",
          label: "Téléphone",
          type: "template-input",
          placeholder: "+33 1 23 45 67 89",
          example: "+33 1 23 45 67 89",
        },
        {
          key: "contactOrgId",
          label: "ID de l'organisation",
          type: "template-input",
          placeholder: "{{Organization.id}}",
          example: "456",
        },
      ],
    },
    {
      slug: "add-note",
      label: "Ajouter une Note",
      description:
        "Ajouter une note à un deal ou contact dans Pipedrive",
      category: "Pipedrive",
      stepFunction: "addPipedriveNoteStep",
      stepImportPath: "add-note",
      outputFields: [
        { field: "id", description: "ID de la note" },
        { field: "content", description: "Contenu de la note" },
      ],
      configFields: [
        {
          key: "noteContent",
          label: "Contenu de la note",
          type: "template-textarea",
          placeholder: "Notes sur ce deal...",
          rows: 4,
          example: "Call de suivi effectué le {{Date.today}}",
          required: true,
        },
        {
          key: "dealId",
          label: "ID du deal (optionnel)",
          type: "template-input",
          placeholder: "{{Deal.id}}",
          example: "789",
        },
        {
          key: "personId",
          label: "ID du contact (optionnel)",
          type: "template-input",
          placeholder: "{{Contact.id}}",
          example: "123",
        },
      ],
    },
    {
      slug: "update-deal",
      label: "Mettre à jour un Deal",
      description: "Mettre à jour un deal existant dans Pipedrive",
      category: "Pipedrive",
      stepFunction: "updatePipedriveDealStep",
      stepImportPath: "update-deal",
      outputFields: [
        { field: "id", description: "ID du deal" },
        { field: "title", description: "Titre du deal" },
        { field: "status", description: "Statut du deal" },
      ],
      configFields: [
        {
          key: "dealId",
          label: "ID du deal",
          type: "template-input",
          placeholder: "{{Deal.id}}",
          example: "789",
          required: true,
        },
        {
          key: "dealTitle",
          label: "Nouveau titre",
          type: "template-input",
          placeholder: "Acquisition - {{Company.name}}",
          example: "Acquisition - Entreprise XYZ",
        },
        {
          key: "dealValue",
          label: "Nouvelle valeur (€)",
          type: "template-input",
          placeholder: "2000000",
          example: "2000000",
        },
        {
          key: "dealStatus",
          label: "Nouveau statut",
          type: "select",
          options: [
            { value: "open", label: "Ouvert" },
            { value: "won", label: "Gagné" },
            { value: "lost", label: "Perdu" },
          ],
        },
      ],
    },
  ],
};

registerIntegration(pipedrivePlugin);
export default pipedrivePlugin;
