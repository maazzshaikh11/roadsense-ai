import { DATASET_AUTHOR, DATASET_COVERAGE, DATASET_FILENAME, DATASET_LICENSE, DATASET_NAME, DATASET_SOURCE_URL, RISK_FORMULA, RISK_METHOD } from "../types";

export default function About() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">About &amp; Data Sources</h1>
        <p className="mt-1 text-sm text-muted">What RoadSense AI does, where its data comes from, how risk is calculated, and what it cannot claim.</p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <h2 className="font-semibold">Project objective</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Analyse historical road accidents and environmental conditions to identify accident hotspots, estimate accident-related
          risk, and visualise risk patterns geographically — across four factor groups: historical accidents and severity, road
          characteristics and infrastructure, weather and visibility, and traffic density and time-related patterns. Observed
          historical patterns, ML severity predictions, estimated/external information, and missing information are kept distinct
          throughout the application.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <h2 className="font-semibold">Dataset</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2"><dt className="w-32 text-muted">Name</dt><dd>{DATASET_NAME}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="w-32 text-muted">Author</dt><dd>{DATASET_AUTHOR}</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="w-32 text-muted">Coverage</dt><dd>{DATASET_COVERAGE} (US road accident records)</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="w-32 text-muted">File</dt><dd>{DATASET_FILENAME} — place at <code>data/raw/US_Accidents_March23.csv</code></dd></div>
          <div className="flex flex-wrap gap-2"><dt className="w-32 text-muted">Licence</dt><dd>{DATASET_LICENSE} (per Kaggle dataset metadata)</dd></div>
          <div className="flex flex-wrap gap-2"><dt className="w-32 text-muted">Source</dt><dd><a className="text-teal-300 underline" href={DATASET_SOURCE_URL} target="_blank" rel="noreferrer">{DATASET_SOURCE_URL}</a></dd></div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Attribution is preserved in the code (backend/app/core/config.py, DATASET_SOURCE_URL), in this page, and in the project
          README. The licence&apos;s non-commercial and share-alike conditions apply. The raw dataset is not committed to Git.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <h2 className="font-semibold">External data sources</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Map tiles: OpenStreetMap, © OpenStreetMap contributors (attribution shown on every map).</li>
          <li>No live weather provider and no live traffic provider are configured in this build. Any future provider must sit behind a provider interface, use an environment-variable API key, and display its source and observation time.</li>
          <li>OpenStreetMap Overpass road context, if added later, is optional and must not block the main application.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <h2 className="font-semibold">Risk calculation methodology</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{RISK_FORMULA}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{RISK_METHOD}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Geographic grid: 0.05° latitude × 0.05° longitude.</li>
          <li>Minimum sample threshold: 10 accidents per cell; smaller cells are dropped.</li>
          <li>Weights: 0.6 frequency (count relative to the largest cell in the loaded data) + 0.4 severity (mean severity normalised from the 1–4 range).</li>
          <li>Levels: High ≥ 70, Medium ≥ 40, otherwise Low.</li>
          <li>Time window: the observation period shown for each hotspot (its earliest and latest recorded accident dates in the loaded data).</li>
          <li>Normalisation: frequency is normalised against the maximum cell count in the currently loaded dataset, so scores are comparable within a dataset load, not across different loads.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-navy-900 p-5">
        <h2 className="font-semibold">Limitations &amp; responsible use</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Historical hotspot scores describe where accidents clustered in the past. They are not calibrated probabilities of a future crash.</li>
          <li>The severity model predicts severity <em>if</em> an accident occurred under given conditions. It does not predict whether an accident will occur.</li>
          <li>Traffic volume unavailable: the Kaggle dataset does not provide measured vehicles-per-hour for locations. Time-of-day and weekday accident patterns are a historical proxy only, and are labelled as such wherever shown.</li>
          <li>Road geometry, road type, and intersection status are not invented for arbitrary coordinates; only dataset-recorded infrastructure flags are shown.</li>
          <li>Weather shown is historical weather recorded with accidents, not live weather.</li>
          <li>Missing road/traffic data is treated as missing, never as zero risk.</li>
          <li>This is an academic project. Do not use it for operational safety decisions, enforcement, or insurance pricing.</li>
        </ul>
      </section>
    </div>
  );
}
