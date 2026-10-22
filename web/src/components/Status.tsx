import { API_BASE, ApiError } from "../api/client";
import "./Status.css";

type Props = { isLoading: boolean; error: unknown; onRetry(): void; children: React.ReactNode };

export function Status({ isLoading, error, onRetry, children }: Props) {
  if (isLoading) {
    return (
      <div role="region" aria-label="Loading comparison" aria-busy="true" className="status">
        Loading…
      </div>
    );
  }
  if (error instanceof ApiError) {
    return (
      <div role="alert" className="status status-error">
        {error.status === null ? (
          <>
            <p>{`Could not reach the API (${API_BASE}). Is \`docker compose up\` running in api/?`}</p>
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
