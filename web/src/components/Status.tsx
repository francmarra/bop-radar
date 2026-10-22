import { API_BASE, ApiError } from "../api/client";
import "./Status.css";

type Props = { isLoading: boolean; error: unknown; onRetry(): void; children: React.ReactNode; label?: string };

export function Status({ isLoading, error, onRetry, children, label = "Loading comparison" }: Props) {
  if (isLoading) {
    return (
      <div role="region" aria-label={label} aria-busy="true" className="status">
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="status status-error">
        {!(error instanceof ApiError) || error.status === null ? (
          <>
            <p>{error instanceof ApiError ? `Could not reach the API (${API_BASE}). Is \`docker compose up\` running in api/?` : "Something went wrong."}</p>
            <button type="button" onClick={onRetry}>
              Try again
            </button>
          </>
        ) : (
          <p>{error.detail}</p>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
