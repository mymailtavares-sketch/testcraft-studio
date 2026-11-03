export type WorkItem = {
  id: number;
  title: string;
  state: string;
  workItemType: string;
  description?: string;
  acceptanceCriteria?: string;
  refinementNotes?: {question: string; answer: string}[];
};

export type TestStep = {
  action: string;
  expectedResult: string;
};

export type PublicationDestination = {
  planId: number;
  planName: string;
  suiteId: number;
  suitePath: string;
};

export type TestCase = {
  localId: string;
  title: string;
  titleName?: string;
  titleOutcome?: "OK" | "NOT OK";
  titleCategoryExplicit?: boolean;
  titleCategory?: string;
  description: string;
  priority: 1 | 2 | 3 | 4;
  testType: string;
  automationStatus: "Manual" | "Automated" | "Planned";
  testedComponent: string;
  testedSubcomponent?: string;
  publicationDestination?: PublicationDestination;
  reviewStatus?: "draft" | "reviewed";
  preconditions: string;
  testData: string;
  steps: TestStep[];

  publicationAttempt?: {
    status: "needsReview" | "invalid" | "notProcessed";
    error?: string;
    at: string;
  };

  // Identificação da publicação na demonstração
  azureDevOpsId?: number;
  publishedPlanId?: number;
  publishedSuiteId?: number;
}; 

