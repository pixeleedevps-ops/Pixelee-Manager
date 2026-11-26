export function Section({ title, icon: Icon, children, extra }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {Icon && <Icon size={16} className="text-slate-500" />}{title}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}
