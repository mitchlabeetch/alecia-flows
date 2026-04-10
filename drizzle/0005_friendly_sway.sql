ALTER TABLE "workflow_execution_logs" DROP CONSTRAINT "workflow_execution_logs_execution_id_workflow_executions_id_fk";
--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "workflow_execution_logs" ALTER COLUMN "duration" SET DATA TYPE integer;
--> statement-breakpoint
ALTER TABLE "workflow_executions" ALTER COLUMN "duration" SET DATA TYPE integer;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "workflow_execution_logs" ADD CONSTRAINT "workflow_execution_logs_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;
