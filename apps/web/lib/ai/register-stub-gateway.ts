/**
 * Side-effect import: registers the AI Gateway stub inside the Workflow step
 * bundle (instrumentation.ts only runs in the main Next server, not step routes).
 */
import { registerStubGateway } from "@ssota/agent-runtime";
import { registerActionWorkerScope } from "@/lib/actions/register-worker-scope";

registerStubGateway();
registerActionWorkerScope();
