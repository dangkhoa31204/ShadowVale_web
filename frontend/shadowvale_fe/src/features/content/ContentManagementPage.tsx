import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeading } from '../shared/ui';
import { ContentPage } from './ContentPage';
import { ContentVersions } from '../releases/ReleasesPage';
import { GameCatalogPage } from './GameCatalogPage';

export function ContentManagementPage() {
  const navigate = useNavigate();
  const { draftId } = useParams();
  const [params] = useSearchParams();
  const published = !draftId && params.get('view') === 'published';
  const unity = !draftId && params.get('view') === 'unity';
  return <div className="sv-page">
    <PageHeading title="Content management" description="Author game content, submit it for review and track published content bundles." />
    <Tabs value={unity ? 'unity' : published ? 'published' : 'author'} onValueChange={value => navigate(value === 'author' ? '/admin/content' : '/admin/content?view=' + value)}>
      <TabsList variant="line" aria-label="Content management">
        <TabsTrigger value="author">Author content</TabsTrigger>
        <TabsTrigger value="published">Published content</TabsTrigger>
        <TabsTrigger value="unity">Unity game catalog</TabsTrigger>
      </TabsList>
    </Tabs>
    {unity ? <GameCatalogPage embedded /> : published ? <ContentVersions embedded /> : <ContentPage embedded />}
  </div>;
}
