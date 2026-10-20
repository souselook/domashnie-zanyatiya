import { describeError, type CoreError } from '../core/errors';

export default function ErrorPanel({ error }: { error: CoreError }) {
  return (
    <div role="alert" className="card border-red-200 bg-red-50 text-red-900">
      <h3 className="font-extrabold mb-1">Что-то не так с модулем</h3>
      <p className="mb-2">{describeError(error)}</p>
      <p className="font-semibold">{error.message}</p>
      {error.detail && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer">Технические детали</summary>
          <code className="block mt-1 break-all bg-white/60 rounded p-2">{error.detail}</code>
        </details>
      )}
    </div>
  );
}
