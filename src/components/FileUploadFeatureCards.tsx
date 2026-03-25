import { FILE_UPLOAD_FEATURES } from './fileUploadFeatures';

export function FileUploadFeatureCards() {
  return (
    <div className="mt-10 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
      {FILE_UPLOAD_FEATURES.map((f) => (
        <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-[#202020]">
          <div className="mb-2 text-2xl">{f.icon}</div>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.title}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.desc}</div>
        </div>
      ))}
    </div>
  );
}
