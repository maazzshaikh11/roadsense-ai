import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard from "../components/KpiCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import SetupNotice from "../components/SetupNotice";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";
import { Activity, Gauge, Target } from "lucide-react";

export default function ModelInfo() {
  const info = useApi(() => api.modelInfo(), []);

  if (info.loading) return <LoadingSkeleton lines={5} label="Loading model information…" />;
  if (info.error) return <SetupNotice message={info.error.detail} />;
  const d = info.data;
  if (!d || !d.trained || !d.metrics) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Model Information</h1>
        <SetupNotice
          title="Model not trained yet — no metrics to show"
          message={d?.setup_message ?? "Model not trained yet. Run python -m app.ml.train from backend/ after preprocessing. No evaluation metrics are displayed until a real training run has produced them."}
        />
        <p className="text-sm text-muted">
          Intended model: RandomForestClassifier in a scikit-learn Pipeline (see backend/app/ml/train.py), trained on severity labels 1–4
          with a stratified 80/20 split and random_state 42. This page will show its real metrics, confusion matrix, and feature
          importances once training has run.
        </p>
      </div>
    );
  }

  const m = d.metrics;
  const reportRows = m.classification_report
    ? Object.entries(m.classification_report).filter(([k]) => !["accuracy", "macro avg", "weighted avg"].includes(k))
    : [];
  const imps = (m.feature_importances ?? []).slice(0, 15).map((f) => ({ label: f.feature.replace("num__", "").replace("cat__", "").replace("bool__", ""), count: Math.round(f.importance * 10000) / 10000 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Model Information</h1>
        <p className="mt-1 text-sm text-muted">Severity classification only — not an accident-occurrence forecast. Feature importances are model associations, not proof of causation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Target} label="Model type" value={d.model_type ?? "—"} sub={`Version: ${d.model_version ?? "—"}`} />
        <KpiCard icon={Gauge} label="Accuracy" value={m.accuracy !== undefined ? m.accuracy.toFixed(4) : "—"} sub={`Baseline (most-frequent): ${m.baseline_accuracy !== undefined ? m.baseline_accuracy.toFixed(4) : "—"}`} />
        <KpiCard icon={Activity} label="Macro F1" value={m.macro_f1 !== undefined ? m.macro_f1.toFixed(4) : "—"} sub={`Macro precision ${m.macro_precision?.toFixed(4) ?? "—"} · recall ${m.macro_recall?.toFixed(4) ?? "—"}`} />
        <KpiCard icon={Activity} label="Train / test" value={`${m.train_size?.toLocaleString() ?? "—"} / ${m.test_size?.toLocaleString() ?? "—"}`} sub={`Trained at: ${d.trained_at ?? "—"}`} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <h3 className="font-semibold">Training details</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Target</dt><dd>{d.target ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted">Methodology</dt><dd>{d.methodology ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted">Class counts (training data)</dt><dd>{m.class_counts ? Object.entries(m.class_counts).map(([k, v]) => `${k}: ${v.toLocaleString()}`).join(" · ") : "—"}</dd></div>
        </dl>
        <h4 className="mt-5 font-medium">Features used</h4>
        <p className="mt-1 flex flex-wrap gap-2 text-xs">
          {(d.features ?? []).map((f) => (
            <span key={f} className="rounded-full border border-white/10 px-2 py-1 text-muted">{f}</span>
          ))}
        </p>
        <p className="mt-2 text-xs text-muted">Severity itself is never a predictor. Latitude/longitude are not severity-model features.</p>
      </div>

      {m.confusion_matrix && m.labels && (
        <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
          <h3 className="font-semibold">Confusion matrix</h3>
          <p className="mt-1 text-xs text-muted">Rows = true severity, columns = predicted severity.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr><th className="p-2 text-left text-muted">True \ Predicted</th>{m.labels.map((l) => <th key={l} className="p-2 text-right">{l}</th>)}</tr>
              </thead>
              <tbody>
                {m.confusion_matrix.map((row, i) => (
                  <tr key={m.labels![i]} className="border-t border-white/5">
                    <td className="p-2 text-muted">{m.labels![i]}</td>
                    {row.map((v, j) => <td key={j} className="p-2 text-right">{v.toLocaleString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportRows.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
          <h3 className="font-semibold">Per-class classification report</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted"><th className="p-2">Class</th><th className="p-2 text-right">Precision</th><th className="p-2 text-right">Recall</th><th className="p-2 text-right">F1</th><th className="p-2 text-right">Support</th></tr>
              </thead>
              <tbody>
                {reportRows.map(([cls, vals]) => {
                  const v = vals as Record<string, number>;
                  return (
                    <tr key={cls} className="border-t border-white/5">
                      <td className="p-2">{cls}</td>
                      <td className="p-2 text-right">{v.precision?.toFixed(3) ?? "—"}</td>
                      <td className="p-2 text-right">{v.recall?.toFixed(3) ?? "—"}</td>
                      <td className="p-2 text-right">{v["f1-score"]?.toFixed(3) ?? "—"}</td>
                      <td className="p-2 text-right">{v.support?.toLocaleString() ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {imps.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
          <h3 className="font-semibold">Feature importances (model associations, not causation)</h3>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={imps} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="#1b3355" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#93a4bc" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={170} stroke="#93a4bc" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#12233d", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }} />
                <Bar dataKey="count" fill="#2dd4bf" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <h3 className="font-semibold">Known limitations</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {(d.limitations ?? []).map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}
