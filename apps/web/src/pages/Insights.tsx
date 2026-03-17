import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import InsightForm from '../features/insights/InsightForm';
import InsightResult from '../features/insights/InsightResult';
import { useGenerateInsight } from '../features/insights/useGenerateInsight';
import { useCountryEntities } from '../features/insights/useCountryEntities';

export default function Insights() {
  const { data: countries } = useCountryEntities();
  const mutation = useGenerateInsight();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">AI Insights</h1>
            <p className="text-sm text-slate-400 mt-1">
              Generate intelligence summaries powered by AI analysis
            </p>
          </div>

          <InsightForm
            conflicts={[]}
            countries={countries ?? []}
            isLoading={mutation.isPending}
            onSubmit={data => mutation.mutate(data)}
          />

          {mutation.isError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to generate insight'}
            </div>
          )}

          {mutation.data && <InsightResult data={mutation.data} />}
        </div>
      </div>
    </ProtectedRoute>
  );
}
