import { AlertTriangle, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { SETUP_MESSAGE } from "../services/api";

export default function SetupNotice({ message, title = "Setup required — no data to show yet" }: { message?: string; title?: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5" role="status">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <h3 className="font-semibold text-amber-200">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-100/80">{message ?? SETUP_MESSAGE}</p>
          <p className="mt-3 text-sm text-muted">
            Nothing on this page is estimated or invented while the dataset is missing. Download the dataset from{" "}
            <a className="text-teal-300 underline" href="https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents" target="_blank" rel="noreferrer">
              Kaggle
            </a>{" "}
            (author Sobhan Moosavi, CC BY-NC-SA 4.0), place it at <code className="text-ink">data/raw/US_Accidents_March23.csv</code>, then
            run preprocessing and, for predictions, model training. Details:{" "}
            <Link className="text-teal-300 underline" to="/about">About &amp; Data Sources</Link>.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Database className="h-4 w-4" /> Backend returns HTTP 503 with this message until processed data exists.
      </div>
    </div>
  );
}
