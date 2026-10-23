import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeading } from '../shared/ui';
import { ContentPage } from './ContentPage';
import { ContentVersions } from '../releases/ReleasesPage';

export function ContentManagementPage() {
  const navigate = useNavigate();
  const { draftId } = useParams();
  const [params] = useSearchParams();
  const published = !draftId && params.get('view') === 'published';
  return <div className="sv-page">
    <PageHeading title="Content management" description="Author game content, submit it for review and track published content bundles." />
    <Tabs value={published ? 'published' : 'author'} onValueChange={value => navigate(value === 'published' ? '/admin/content?view=published' : '/admin/content')}>
      <TabsList variant="line" aria-label="Content management">
        <TabsTrigger value="author">Author content</TabsTrigger>
        <TabsTrigger value="published">Published content</TabsTrigger>
      </TabsList>
    </Tabs>
    {published ? <ContentVersions embedded /> : <ContentPage embedded />}
  </div>;
}
