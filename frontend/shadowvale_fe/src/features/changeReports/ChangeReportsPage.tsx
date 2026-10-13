import { Navigate, useParams } from 'react-router-dom';

/** Preserve saved links while reports now belong to Content authoring. */
export function ChangeReportsPage() {
  const { draftId } = useParams();
  return <Navigate replace to={'/admin/content' + (draftId ? '/' + encodeURIComponent(draftId) : '') + '?section=report'} />;
}
